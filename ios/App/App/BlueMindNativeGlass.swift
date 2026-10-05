import Capacitor
import AVFoundation
import LocalAuthentication
import Photos
import PhotosUI
import Security
import SwiftUI
import UIKit
import UniformTypeIdentifiers
import UserNotifications
import WebKit

@objc(BlueMindSecureSessionPlugin)
final class BlueMindSecureSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BlueMindSecureSessionPlugin"
    let jsName = "BlueMindSecureSession"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "faceIDStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enableFaceID", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disableFaceID", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlockWithFaceID", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPrivacyShield", returnType: CAPPluginReturnPromise)
    ]

    private let service = "com.bluemind.ai.auth"
    private let account = "primary-session"
    private let biometricAccount = "primary-session-biometric"
    private let faceIDEnabledKey = "BlueMindFaceIDLockEnabled"

    private var faceIDEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: faceIDEnabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: faceIDEnabledKey) }
    }

    private func finishBiometricPresentation(_ operation: String, authenticated: Bool) {
#if DEBUG
        print("[BlueMind FaceID] \(operation) completed authenticated=\(authenticated); removing native privacy shield")
#endif
        DispatchQueue.main.async { [weak self] in
            (self?.bridge?.viewController as? BlueMindBridgeViewController)?.setPrivacyShieldVisible(false)
        }
    }

    @objc func load(_ call: CAPPluginCall) {
        if faceIDEnabled {
            call.resolve(["session": NSNull(), "requiresFaceID": true])
            return
        }
        resolveSession(call, query: query(for: account))
    }

    private func resolveSession(_ call: CAPPluginCall, query originalQuery: [String: Any], context: LAContext? = nil) {
        var query = originalQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        if let context {
            query[kSecUseAuthenticationContext as String] = context
            query[kSecUseOperationPrompt as String] = "Unlock BlueMind"
        }
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            if status == errSecItemNotFound {
                call.resolve(["session": NSNull()])
            } else {
                call.reject("Unable to read the secure session", "KEYCHAIN_READ_FAILED")
            }
            return
        }
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            call.reject("The secure session is invalid", "KEYCHAIN_DATA_INVALID")
            return
        }
        call.resolve(["session": object])
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), !token.isEmpty else {
            call.reject("An access token is required", "KEYCHAIN_TOKEN_MISSING")
            return
        }
        var payload: [String: Any] = ["token": token]
        if let refreshSession = call.getString("refreshSession"), !refreshSession.isEmpty {
            payload["refreshSession"] = refreshSession
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else {
            call.reject("Unable to encode the secure session", "KEYCHAIN_ENCODE_FAILED")
            return
        }
        let shouldProtectWithFaceID = faceIDEnabled && isFaceIDAvailable()
        if faceIDEnabled && !shouldProtectWithFaceID {
            SecItemDelete(query(for: biometricAccount) as CFDictionary)
            faceIDEnabled = false
        }
        let status = shouldProtectWithFaceID ? saveBiometricSession(data) : saveStandardSession(data)
        guard status == errSecSuccess else {
            call.reject("Unable to update the secure session", "KEYCHAIN_SAVE_FAILED")
            return
        }
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        let standardStatus = SecItemDelete(query(for: account) as CFDictionary)
        let biometricStatus = SecItemDelete(query(for: biometricAccount) as CFDictionary)
        guard [standardStatus, biometricStatus].allSatisfy({ $0 == errSecSuccess || $0 == errSecItemNotFound }) else {
            call.reject("Unable to clear the secure session", "KEYCHAIN_CLEAR_FAILED")
            return
        }
        faceIDEnabled = false
        call.resolve()
    }

    @objc func faceIDStatus(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
            && context.biometryType == .faceID
        call.resolve([
            "available": available,
            "enabled": faceIDEnabled,
            "hasProtectedSession": itemExists(account: biometricAccount)
        ])
    }

    @objc func enableFaceID(_ call: CAPPluginCall) {
        performEnableFaceID(call)
    }

    private func performEnableFaceID(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedCancelTitle = "Not Now"
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error), context.biometryType == .faceID else {
            call.reject("Face ID is not available on this device", "FACE_ID_UNAVAILABLE")
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Enable Face ID Lock for BlueMind") { [weak self] success, authError in
            guard let self else { return }
            defer { self.finishBiometricPresentation("enable", authenticated: success) }
#if DEBUG
            print("[BlueMind FaceID] enable callback success=\(success)")
#endif
            guard success else {
                call.reject("Face ID was not completed", self.faceIDErrorCode(authError))
                return
            }
            guard let data = self.readWithoutAuthentication(account: self.account) else {
                call.reject("Log in normally before enabling Face ID", "FACE_ID_SESSION_MISSING")
                return
            }
            let status = self.saveBiometricSession(data)
            guard status == errSecSuccess else {
                call.reject("Unable to protect the session with Face ID", "FACE_ID_KEYCHAIN_FAILED")
                return
            }
            SecItemDelete(self.query(for: self.account) as CFDictionary)
            self.faceIDEnabled = true
            call.resolve(["enabled": true])
        }
    }

    @objc func disableFaceID(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Turn off Face ID Lock for BlueMind") { [weak self] success, authError in
            guard let self else { return }
            defer { self.finishBiometricPresentation("disable", authenticated: success) }
#if DEBUG
            print("[BlueMind FaceID] disable callback success=\(success)")
#endif
            guard success else {
                call.reject("Device authentication was not completed", self.faceIDErrorCode(authError))
                return
            }
            guard let data = self.readBiometricSession(context: context) else {
                self.faceIDEnabled = false
                call.reject("The protected session is no longer available. Please log in again.", "FACE_ID_SESSION_INVALID")
                return
            }
            guard self.saveStandardSession(data) == errSecSuccess else {
                call.reject("Unable to update the secure session", "KEYCHAIN_SAVE_FAILED")
                return
            }
            SecItemDelete(self.query(for: self.biometricAccount) as CFDictionary)
            self.faceIDEnabled = false
            call.resolve(["enabled": false])
        }
    }

    @objc func unlockWithFaceID(_ call: CAPPluginCall) {
        guard faceIDEnabled else {
            call.reject("Face ID Lock is not enabled", "FACE_ID_NOT_ENABLED")
            return
        }
        let context = LAContext()
        context.localizedCancelTitle = "Use Login"
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error), context.biometryType == .faceID else {
            call.reject("Face ID is unavailable. Use your BlueMind login.", "FACE_ID_UNAVAILABLE")
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock BlueMind") { [weak self] success, authError in
            guard let self else { return }
            defer { self.finishBiometricPresentation("unlock", authenticated: success) }
#if DEBUG
            print("[BlueMind FaceID] unlock callback success=\(success)")
#endif
            guard success else {
                call.reject("Face ID was not completed", self.faceIDErrorCode(authError))
                return
            }
            self.resolveSession(call, query: self.query(for: self.biometricAccount), context: context)
        }
    }

    @objc func setPrivacyShield(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        DispatchQueue.main.async { [weak self] in
#if DEBUG
            print("[BlueMind FaceID] bridge privacy shield visible=\(visible)")
#endif
            (self?.bridge?.viewController as? BlueMindBridgeViewController)?.setPrivacyShieldVisible(visible)
            call.resolve(["visible": visible])
        }
    }

    private func saveStandardSession(_ data: Data) -> OSStatus {
        let base = query(for: account)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let updateStatus = SecItemUpdate(base as CFDictionary, attributes as CFDictionary)
        if updateStatus != errSecItemNotFound { return updateStatus }
        var insert = base
        attributes.forEach { insert[$0.key] = $0.value }
        return SecItemAdd(insert as CFDictionary, nil)
    }

    private func saveBiometricSession(_ data: Data) -> OSStatus {
        var accessError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .biometryCurrentSet,
            &accessError
        ) else { return errSecParam }
        let base = query(for: biometricAccount)
        SecItemDelete(base as CFDictionary)
        var insert = base
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessControl as String] = access
        return SecItemAdd(insert as CFDictionary, nil)
    }

    private func readWithoutAuthentication(account: String) -> Data? {
        var request = query(for: account)
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess else { return nil }
        return result as? Data
    }

    private func readBiometricSession(context: LAContext) -> Data? {
        var request = query(for: biometricAccount)
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        request[kSecUseAuthenticationContext as String] = context
        var result: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &result) == errSecSuccess else { return nil }
        return result as? Data
    }

    private func itemExists(account: String) -> Bool {
        var request = query(for: account)
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        request[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail
        let status = SecItemCopyMatching(request as CFDictionary, nil)
        return status == errSecSuccess || status == errSecInteractionNotAllowed
    }

    private func isFaceIDAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
            && context.biometryType == .faceID
    }

    private func faceIDErrorCode(_ error: Error?) -> String {
        guard let code = (error as? LAError)?.code else { return "FACE_ID_FAILED" }
        switch code {
        case .userCancel, .appCancel, .systemCancel: return "FACE_ID_CANCELLED"
        case .biometryLockout: return "FACE_ID_LOCKED"
        case .biometryNotAvailable, .biometryNotEnrolled: return "FACE_ID_UNAVAILABLE"
        default: return "FACE_ID_FAILED"
        }
    }

    private func query(for account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}

struct BlueMindGlassMode: Identifiable, Equatable {
    let id: String
    let title: String

    var symbol: String {
        switch id {
        case "study": return "book.closed"
        case "research": return "scope"
        case "work": return "briefcase"
        case "writing": return "pencil.and.outline"
        case "coding": return "chevron.left.forwardslash.chevron.right"
        default: return "bubble.left.and.bubble.right"
        }
    }
}

struct BlueMindGlassModelOption: Identifiable, Equatable {
    let id: String
    let title: String
    let badge: String
}

struct BlueMindGlassAttachment: Identifiable {
    let id: String
    let name: String
    let type: String
    let size: Int64
    let image: UIImage?
    let originalData: String
    let assetIdentifier: String
    let uploadState: String
}

private final class BlueMindCameraGlassIconButton: UIButton {
    private let materialView = UIVisualEffectView(effect: UIBlurEffect(style: .systemThinMaterialDark))

    override init(frame: CGRect) {
        super.init(frame: frame)
        materialView.isUserInteractionEnabled = false
        insertSubview(materialView, at: 0)
        clipsToBounds = true
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

    override func layoutSubviews() {
        super.layoutSubviews()
        materialView.frame = bounds
        materialView.layer.cornerRadius = bounds.height / 2
        materialView.clipsToBounds = true
        sendSubviewToBack(materialView)
        if let imageView { bringSubviewToFront(imageView) }
    }
}

private final class BlueMindCameraViewController: UIViewController, AVCapturePhotoCaptureDelegate {
    var onCancel: (() -> Void)?
    var onUsePhoto: ((UIImage, Data) -> Void)?

    private let session = AVCaptureSession()
    private let primaryColor: UIColor
    private let photoOutput = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "com.bluemind.camera.session", qos: .userInitiated)
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var currentPosition: AVCaptureDevice.Position = .back
    private var currentInput: AVCaptureDeviceInput?
    private var capturedImage: UIImage?
    private var capturedData: Data?

    private let previewView = UIView()
    private let reviewImageView = UIImageView()
    private let controls = UIView()
    private let reviewControls = UIStackView()

    init(primaryColor: UIColor) {
        self.primaryColor = primaryColor
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureLayout()
        requestAccessAndConfigure()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = previewView.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sessionQueue.async { [session] in if session.isRunning { session.stopRunning() } }
    }

    private func configureLayout() {
        previewView.translatesAutoresizingMaskIntoConstraints = false
        previewView.clipsToBounds = true
        view.addSubview(previewView)

        reviewImageView.translatesAutoresizingMaskIntoConstraints = false
        reviewImageView.contentMode = .scaleAspectFit
        reviewImageView.backgroundColor = .black
        reviewImageView.isHidden = true
        view.addSubview(reviewImageView)

        controls.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controls)

        let close = glassButton(symbol: "xmark", accessibilityLabel: "Close camera", action: #selector(closeCamera))
        let switchCamera = glassButton(symbol: "arrow.triangle.2.circlepath.camera", accessibilityLabel: "Switch camera", action: #selector(switchCameraPosition))
        let shutter = UIButton(type: .system)
        shutter.translatesAutoresizingMaskIntoConstraints = false
        shutter.backgroundColor = .white
        shutter.layer.cornerRadius = 37
        shutter.layer.borderWidth = 5
        shutter.layer.borderColor = UIColor.white.withAlphaComponent(0.42).cgColor
        shutter.accessibilityLabel = "Take photo"
        shutter.addTarget(self, action: #selector(capturePhoto), for: .touchUpInside)
        controls.addSubview(close)
        controls.addSubview(shutter)
        controls.addSubview(switchCamera)

        reviewControls.axis = .horizontal
        reviewControls.alignment = .center
        reviewControls.distribution = .fillEqually
        reviewControls.spacing = 16
        reviewControls.translatesAutoresizingMaskIntoConstraints = false
        reviewControls.isHidden = true
        let retake = materialTextButton(title: "Retake", primary: false, action: #selector(retakePhoto))
        let use = materialTextButton(title: "Use Photo", primary: true, action: #selector(usePhoto))
        reviewControls.addArrangedSubview(retake)
        reviewControls.addArrangedSubview(use)
        view.addSubview(reviewControls)

        NSLayoutConstraint.activate([
            previewView.topAnchor.constraint(equalTo: view.topAnchor),
            previewView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            previewView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            previewView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            reviewImageView.topAnchor.constraint(equalTo: view.topAnchor),
            reviewImageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            reviewImageView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            reviewImageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            controls.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            controls.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            controls.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -22),
            controls.heightAnchor.constraint(equalToConstant: 82),
            close.leadingAnchor.constraint(equalTo: controls.leadingAnchor),
            close.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            close.widthAnchor.constraint(equalToConstant: 50), close.heightAnchor.constraint(equalToConstant: 50),
            shutter.centerXAnchor.constraint(equalTo: controls.centerXAnchor),
            shutter.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            shutter.widthAnchor.constraint(equalToConstant: 74), shutter.heightAnchor.constraint(equalToConstant: 74),
            switchCamera.trailingAnchor.constraint(equalTo: controls.trailingAnchor),
            switchCamera.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            switchCamera.widthAnchor.constraint(equalToConstant: 50), switchCamera.heightAnchor.constraint(equalToConstant: 50),
            reviewControls.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            reviewControls.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            reviewControls.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            reviewControls.heightAnchor.constraint(equalToConstant: 52),
        ])
    }

    private func glassButton(symbol: String, accessibilityLabel: String, action: Selector) -> UIButton {
        let button = BlueMindCameraGlassIconButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        let configuration = UIImage.SymbolConfiguration(pointSize: 19, weight: .semibold)
        button.setImage(UIImage(systemName: symbol, withConfiguration: configuration)?.withRenderingMode(.alwaysTemplate), for: .normal)
        button.tintColor = .white
        button.accessibilityLabel = accessibilityLabel
        button.layer.cornerRadius = 25
        button.clipsToBounds = true
        button.imageView?.contentMode = .scaleAspectFit
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func materialTextButton(title: String, primary: Bool, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        button.layer.cornerRadius = 18
        button.clipsToBounds = true
        button.backgroundColor = primary ? primaryColor.withAlphaComponent(0.92) : .clear
        if !primary {
            let material = UIVisualEffectView(effect: UIBlurEffect(style: .systemThinMaterialDark))
            material.isUserInteractionEnabled = false
            material.translatesAutoresizingMaskIntoConstraints = false
            button.insertSubview(material, at: 0)
            NSLayoutConstraint.activate([
                material.leadingAnchor.constraint(equalTo: button.leadingAnchor), material.trailingAnchor.constraint(equalTo: button.trailingAnchor),
                material.topAnchor.constraint(equalTo: button.topAnchor), material.bottomAnchor.constraint(equalTo: button.bottomAnchor),
            ])
        }
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func requestAccessAndConfigure() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configureSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted { self?.configureSession() } else { DispatchQueue.main.async { self?.closeCamera() } }
            }
        default: closeCamera()
        }
    }

    private func configureSession() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            session.beginConfiguration()
            session.sessionPreset = .photo
            guard installInput(position: currentPosition), session.canAddOutput(photoOutput) else {
                session.commitConfiguration()
                return
            }
            session.addOutput(photoOutput)
            session.commitConfiguration()
            DispatchQueue.main.async {
                let layer = AVCaptureVideoPreviewLayer(session: self.session)
                layer.videoGravity = .resizeAspectFill
                layer.frame = self.previewView.bounds
                self.previewView.layer.insertSublayer(layer, at: 0)
                self.previewLayer = layer
            }
            session.startRunning()
        }
    }

    @discardableResult private func installInput(position: AVCaptureDevice.Position) -> Bool {
        if let currentInput { session.removeInput(currentInput) }
        let discovery = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera], mediaType: .video, position: position)
        guard let device = discovery.devices.first, let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else { return false }
        session.addInput(input)
        currentInput = input
        return true
    }

    @objc private func closeCamera() { onCancel?() }

    @objc private func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        settings.flashMode = .off
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    @objc private func switchCameraPosition() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            session.beginConfiguration()
            let next: AVCaptureDevice.Position = currentPosition == .back ? .front : .back
            if installInput(position: next) { currentPosition = next }
            session.commitConfiguration()
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard error == nil, let data = photo.fileDataRepresentation() else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                self?.capturedData = data
                self?.capturedImage = image
                self?.reviewImageView.image = image
                self?.reviewImageView.isHidden = false
                self?.controls.isHidden = true
                self?.reviewControls.isHidden = false
            }
        }
    }

    @objc private func retakePhoto() {
        capturedData = nil
        capturedImage = nil
        reviewImageView.image = nil
        reviewImageView.isHidden = true
        reviewControls.isHidden = true
        controls.isHidden = false
    }

    @objc private func usePhoto() {
        guard let capturedImage, let capturedData else { return }
        onUsePhoto?(capturedImage, capturedData)
    }
}

@available(iOS 26.0, *)
@MainActor
private final class BlueMindRecentPhotos: ObservableObject {
    struct Item: Identifiable {
        let id: String
        let order: Int
        let asset: PHAsset
        let image: UIImage
    }

    @Published var items: [Item] = []
    @Published var permissionDenied = false

    func load() {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        if status == .notDetermined {
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { [weak self] _ in
                Task { @MainActor in self?.load() }
            }
            return
        }
        guard status == .authorized || status == .limited else {
            permissionDenied = true
            return
        }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.fetchLimit = 14
        let assets = PHAsset.fetchAssets(with: .image, options: options)
        let manager = PHCachingImageManager()
        let requestOptions = PHImageRequestOptions()
        requestOptions.deliveryMode = .highQualityFormat
        requestOptions.resizeMode = .fast
        requestOptions.isNetworkAccessAllowed = true
        assets.enumerateObjects { [weak self] asset, index, _ in
            manager.requestImage(
                for: asset,
                targetSize: CGSize(width: 240, height: 240),
                contentMode: .aspectFill,
                options: requestOptions
            ) { image, _ in
                guard let image else { return }
                Task { @MainActor in
                    self?.items.append(Item(id: asset.localIdentifier, order: index, asset: asset, image: image))
                    self?.items.sort { $0.order < $1.order }
                }
            }
        }
    }
}

@available(iOS 26.0, *)
@MainActor
private final class BlueMindPhotoLibrary: NSObject, ObservableObject, PHPhotoLibraryChangeObserver {
    struct Album: Identifiable {
        let id: String
        let title: String
        let count: Int
        let collection: PHAssetCollection
        let coverAsset: PHAsset?
    }

    @Published private(set) var assets: [PHAsset] = []
    @Published private(set) var albums: [Album] = []
    @Published private(set) var authorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    @Published private(set) var isLoading = false
    @Published private(set) var selectedAssetIDs: [String] = []
    @Published var selectionLimitReached = false
    @Published var selectedAlbumTitle: String?

    let imageManager = PHCachingImageManager()
    private var thumbnailCache: [String: UIImage] = [:]
    private var assetsByIdentifier: [String: PHAsset] = [:]
    private var currentCollection: PHAssetCollection?
    private let selectionLimit = 10

    override init() {
        super.init()
        PHPhotoLibrary.shared().register(self)
    }

    deinit {
        PHPhotoLibrary.shared().unregisterChangeObserver(self)
    }

    nonisolated func photoLibraryDidChange(_ changeInstance: PHChange) {
        Task { @MainActor [weak self] in self?.reloadLibrary() }
    }

    func requestAccessAndLoad() {
        authorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        switch authorizationStatus {
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { [weak self] status in
                Task { @MainActor in
                    self?.authorizationStatus = status
                    self?.reloadLibrary()
                }
            }
        case .authorized, .limited:
            reloadLibrary()
        default:
            assets = []
            albums = []
        }
    }

    func showAllPhotos() {
        currentCollection = nil
        selectedAlbumTitle = nil
        reloadAssets()
    }

    func open(_ album: Album) {
        currentCollection = album.collection
        selectedAlbumTitle = album.title
        reloadAssets()
    }

    func toggleSelection(for asset: PHAsset) {
        let identifier = asset.localIdentifier
        if let index = selectedAssetIDs.firstIndex(of: identifier) {
            selectedAssetIDs.remove(at: index)
            return
        }
        guard selectedAssetIDs.count < selectionLimit else {
            selectionLimitReached = true
            return
        }
        selectedAssetIDs.append(identifier)
    }

    func selectionNumber(for asset: PHAsset) -> Int? {
        selectedAssetIDs.firstIndex(of: asset.localIdentifier).map { $0 + 1 }
    }

    func cachedThumbnail(for asset: PHAsset) -> UIImage? {
        thumbnailCache[asset.localIdentifier]
    }

    @discardableResult
    func requestThumbnail(for asset: PHAsset, targetSize: CGSize, completion: @escaping (UIImage?) -> Void) -> PHImageRequestID {
        if let cached = thumbnailCache[asset.localIdentifier],
           cachedPixelSize(cached).width >= targetSize.width,
           cachedPixelSize(cached).height >= targetSize.height {
            completion(cached)
            return PHInvalidImageRequestID
        }
        let options = PHImageRequestOptions()
        options.deliveryMode = .opportunistic
        options.resizeMode = .fast
        options.isNetworkAccessAllowed = true
        return imageManager.requestImage(
            for: asset,
            targetSize: targetSize,
            contentMode: .aspectFill,
            options: options
        ) { [weak self] image, info in
            guard let image else { return }
            let isDegraded = (info?[PHImageResultIsDegradedKey] as? Bool) == true
            Task { @MainActor in
                if !isDegraded { self?.thumbnailCache[asset.localIdentifier] = image }
                completion(image)
            }
        }
    }

    func selectedItems(completion: @escaping ([BlueMindRecentPhotos.Item]) -> Void) {
        let orderedAssets = selectedAssetIDs.compactMap { assetsByIdentifier[$0] }
        guard !orderedAssets.isEmpty else {
            completion([])
            return
        }
        let group = DispatchGroup()
        let lock = NSLock()
        var images = Array<UIImage?>(repeating: nil, count: orderedAssets.count)
        for (index, asset) in orderedAssets.enumerated() {
            if let cached = thumbnailCache[asset.localIdentifier],
               min(cachedPixelSize(cached).width, cachedPixelSize(cached).height) >= 360 {
                images[index] = cached
                continue
            }
            group.enter()
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .fast
            options.isNetworkAccessAllowed = true
            imageManager.requestImage(
                for: asset,
                targetSize: CGSize(width: 420, height: 420),
                contentMode: .aspectFill,
                options: options
            ) { image, info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                lock.lock()
                images[index] = image
                lock.unlock()
                group.leave()
            }
        }
        group.notify(queue: .main) {
            let items = orderedAssets.enumerated().compactMap { index, asset -> BlueMindRecentPhotos.Item? in
                guard let image = images[index] else { return nil }
                return .init(id: asset.localIdentifier, order: index, asset: asset, image: image)
            }
            completion(items)
        }
    }

    private func cachedPixelSize(_ image: UIImage) -> CGSize {
        if let cgImage = image.cgImage {
            return CGSize(width: cgImage.width, height: cgImage.height)
        }
        return CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
    }

    private func reloadLibrary() {
        authorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        guard authorizationStatus == .authorized || authorizationStatus == .limited else {
            assets = []
            albums = []
            return
        }
        isLoading = true
        reloadAssets()
        reloadAlbums()
        isLoading = false
    }

    private func imageFetchOptions() -> PHFetchOptions {
        let options = PHFetchOptions()
        options.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        return options
    }

    private func reloadAssets() {
        guard authorizationStatus == .authorized || authorizationStatus == .limited else { return }
        let result: PHFetchResult<PHAsset>
        if let currentCollection {
            result = PHAsset.fetchAssets(in: currentCollection, options: imageFetchOptions())
        } else {
            result = PHAsset.fetchAssets(with: .image, options: imageFetchOptions())
        }
        var loaded: [PHAsset] = []
        result.enumerateObjects { asset, _, _ in loaded.append(asset) }
        assets = loaded
        assetsByIdentifier = Dictionary(uniqueKeysWithValues: loaded.map { ($0.localIdentifier, $0) })
        // Preserve ordered selections across album changes and library refreshes.
        for identifier in selectedAssetIDs where assetsByIdentifier[identifier] == nil {
            let fetched = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
            if let asset = fetched.firstObject { assetsByIdentifier[identifier] = asset }
        }
    }

    private func reloadAlbums() {
        var loaded: [Album] = []
        var identifiers = Set<String>()
        func appendCollections(_ result: PHFetchResult<PHAssetCollection>) {
            result.enumerateObjects { collection, _, _ in
                guard identifiers.insert(collection.localIdentifier).inserted else { return }
                let albumAssets = PHAsset.fetchAssets(in: collection, options: self.imageFetchOptions())
                guard albumAssets.count > 0 else { return }
                loaded.append(.init(
                    id: collection.localIdentifier,
                    title: collection.localizedTitle ?? "Album",
                    count: albumAssets.count,
                    collection: collection,
                    coverAsset: albumAssets.firstObject
                ))
            }
        }
        appendCollections(PHAssetCollection.fetchAssetCollections(with: .smartAlbum, subtype: .any, options: nil))
        appendCollections(PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: nil))
        albums = loaded.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }
}

@available(iOS 26.0, *)
private struct BlueMindPhotoGridCell: View {
    @ObservedObject var library: BlueMindPhotoLibrary
    let asset: PHAsset
    let accentColor: Color
    @State private var image: UIImage?
    @State private var requestID: PHImageRequestID = PHInvalidImageRequestID

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topTrailing) {
                Group {
                    if let image {
                        Image(uiImage: image).resizable().scaledToFill()
                    } else {
                        Rectangle().fill(.secondary.opacity(0.14))
                            .overlay { ProgressView().controlSize(.small) }
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()

                selectionBadge
                    .padding(7)
            }
            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            .overlay {
                if library.selectionNumber(for: asset) != nil {
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .stroke(accentColor, lineWidth: 3)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { library.toggleSelection(for: asset) }
            .onAppear {
                guard image == nil else { return }
                let pixels = max(180, geometry.size.width * UIScreen.main.scale)
                requestID = library.requestThumbnail(for: asset, targetSize: CGSize(width: pixels, height: pixels)) {
                    image = $0
                }
            }
            .onDisappear {
                if requestID != PHInvalidImageRequestID { library.imageManager.cancelImageRequest(requestID) }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(library.selectionNumber(for: asset).map { "Selected photo \($0)" } ?? "Photo")
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder private var selectionBadge: some View {
        if let number = library.selectionNumber(for: asset) {
            Text("\(number)")
                .font(.caption2.bold())
                .foregroundStyle(.white)
                .frame(width: 25, height: 25)
                .background(accentColor, in: Circle())
                .overlay(Circle().stroke(.white, lineWidth: 1.5))
        } else {
            Circle()
                .fill(.black.opacity(0.24))
                .frame(width: 24, height: 24)
                .overlay(Circle().stroke(.white.opacity(0.9), lineWidth: 1.4))
        }
    }
}

@available(iOS 26.0, *)
private struct BlueMindAlbumRow: View {
    @ObservedObject var library: BlueMindPhotoLibrary
    let album: BlueMindPhotoLibrary.Album
    let open: () -> Void
    @State private var coverImage: UIImage?
    @State private var requestID: PHImageRequestID = PHInvalidImageRequestID

    var body: some View {
        Button(action: open) {
            HStack(spacing: 13) {
                Group {
                    if let coverImage { Image(uiImage: coverImage).resizable().scaledToFill() }
                    else { Color.secondary.opacity(0.14).overlay { Image(systemName: "photo.on.rectangle") } }
                }
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(album.title).font(.body.weight(.semibold)).foregroundStyle(.primary)
                    Text("\(album.count) Photos").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onAppear {
            guard let asset = album.coverAsset else { return }
            requestID = library.requestThumbnail(for: asset, targetSize: CGSize(width: 180, height: 180)) { coverImage = $0 }
        }
        .onDisappear {
            if requestID != PHInvalidImageRequestID { library.imageManager.cancelImageRequest(requestID) }
        }
        .accessibilityLabel("\(album.title), \(album.count) photos")
    }
}

@available(iOS 26.0, *)
private struct BlueMindPhotosPickerView: View {
    enum Section: String, CaseIterable { case photos = "Photos"; case albums = "Albums" }

    @StateObject var library: BlueMindPhotoLibrary
    let accentColor: Color
    let cancel: () -> Void
    let manageLimitedAccess: () -> Void
    let openSettings: () -> Void
    let confirm: ([BlueMindRecentPhotos.Item]) -> Void
    @State private var section: Section = .photos
    @State private var isPreparingSelection = false

    private let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 3)

    var body: some View {
        NavigationStack {
            Group {
                switch library.authorizationStatus {
                case .authorized, .limited:
                    libraryContent
                case .denied, .restricted:
                    permissionDeniedView
                default:
                    ProgressView("Requesting Photos Access…")
                }
            }
            .background(Color(uiColor: .systemBackground))
            .navigationTitle(library.selectedAlbumTitle ?? "BlueMind Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close", systemImage: "xmark", action: cancel).labelStyle(.iconOnly)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(addButtonTitle) { addSelection() }
                        .fontWeight(.semibold)
                        .foregroundStyle(library.selectedAssetIDs.isEmpty ? .secondary : accentColor)
                        .disabled(library.selectedAssetIDs.isEmpty || isPreparingSelection)
                }
            }
            .alert("Up to 10 photos", isPresented: $library.selectionLimitReached) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Remove a selected photo before choosing another one.")
            }
            .onAppear { library.requestAccessAndLoad() }
        }
        .preferredColorScheme(.dark)
    }

    private var addButtonTitle: String {
        let count = library.selectedAssetIDs.count
        return count == 0 ? "Add" : "Add (\(count))"
    }

    private var libraryContent: some View {
        VStack(spacing: 0) {
            Picker("Photo Library Section", selection: $section) {
                ForEach(Section.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            if library.authorizationStatus == .limited {
                Button(action: manageLimitedAccess) {
                    HStack {
                        Image(systemName: "photo.badge.plus")
                        Text("Limited Photos Access").font(.subheadline.weight(.semibold))
                        Spacer()
                        Text("Manage").font(.subheadline).foregroundStyle(accentColor)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 9)
                    .background(.thinMaterial)
                }
                .buttonStyle(.plain)
            }

            if section == .photos { photosGrid } else { albumsList }
        }
    }

    private var photosGrid: some View {
        ScrollView(.vertical) {
            if library.selectedAlbumTitle != nil {
                Button {
                    library.showAllPhotos()
                } label: {
                    Label("All Photos", systemImage: "chevron.left")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
            }
            LazyVGrid(columns: gridColumns, spacing: 3) {
                ForEach(library.assets, id: \.localIdentifier) { asset in
                    BlueMindPhotoGridCell(library: library, asset: asset, accentColor: accentColor)
                }
            }
            .padding(.horizontal, 3)
            .padding(.bottom, 18)
        }
        .scrollDismissesKeyboard(.immediately)
        .overlay {
            if library.isLoading && library.assets.isEmpty { ProgressView() }
            else if !library.isLoading && library.assets.isEmpty {
                ContentUnavailableView("No Photos", systemImage: "photo.on.rectangle", description: Text("No accessible photos were found."))
            }
        }
    }

    private var albumsList: some View {
        ScrollView(.vertical) {
            LazyVStack(spacing: 0) {
                ForEach(library.albums) { album in
                    BlueMindAlbumRow(library: library, album: album) {
                        library.open(album)
                        section = .photos
                    }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                    Divider().padding(.leading, 87)
                }
            }
            .padding(.bottom, 18)
        }
        .overlay {
            if library.albums.isEmpty { ContentUnavailableView("No Albums", systemImage: "rectangle.stack") }
        }
    }

    private var permissionDeniedView: some View {
        ContentUnavailableView {
            Label("Photos Access Needed", systemImage: "photo.badge.exclamationmark")
        } description: {
            Text("Allow BlueMind to access photos in iOS Settings.")
        } actions: {
            Button("Open Settings", action: openSettings)
                .buttonStyle(.borderedProminent)
                .tint(accentColor)
        }
    }

    private func addSelection() {
        guard !isPreparingSelection else { return }
        isPreparingSelection = true
        library.selectedItems { items in
            isPreparingSelection = false
            confirm(items)
        }
    }
}

@available(iOS 26.0, *)
private struct BlueMindDarkAttachmentSheetMaterial: UIViewRepresentable {
    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))
    }

    func updateUIView(_ view: UIVisualEffectView, context: Context) {}
}

@available(iOS 26.0, *)
private struct BlueMindChatAttachmentSheet: View {
    @ObservedObject var recentPhotos: BlueMindRecentPhotos
    let action: (String) -> Void
    let confirmPhotos: ([BlueMindRecentPhotos.Item]) -> Void
    @State private var selectedPhotoIDs: [String] = []

    private let tileSize: CGFloat = 94

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(.secondary.opacity(0.42))
                .frame(width: 38, height: 5)
                .padding(.top, 9)
                .padding(.bottom, 15)

            HStack {
                Text("BlueMind")
                    .font(.title3.weight(.bold))
                Spacer()
                Button("All Photos") { action("chatAttachmentPhotos") }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(uiColor: .systemBlue))
            }
            .padding(.horizontal, 20)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            cameraTile { action("chatAttachmentCamera") }

                            ForEach(recentPhotos.items) { item in
                                Button { togglePhoto(item) } label: {
                                    Image(uiImage: item.image)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: tileSize, height: tileSize)
                                        .clipShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
                                        .overlay {
                                            RoundedRectangle(cornerRadius: 17, style: .continuous)
                                                .stroke(.white.opacity(0.10), lineWidth: 0.75)
                                        }
                                        .overlay(alignment: .topTrailing) {
                                            selectionBadge(for: item)
                                                .padding(6)
                                        }
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(selectionOrder(for: item).map { "Selected photo \($0)" } ?? "Select recent photo")
                            }

                            if recentPhotos.permissionDenied {
                                permissionTile {
                                    action("chatAttachmentPhotos")
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.top, 16)

                    Rectangle()
                        .fill(.white.opacity(0.16))
                        .frame(height: 0.5)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)

                    VStack(spacing: 2) {
                        toolRow("Files / PDF", description: "Attach a document or file", symbol: "doc", actionID: "chatAttachmentFiles")
                        toolRow("Create Image", description: "Generate an image with AI", symbol: "sparkles", actionID: "chatToolCreateImage")
                        toolRow("Web Search", description: "Search the web for current information", symbol: "globe", actionID: "chatToolWebSearch")
                        toolRow("Research", description: "Get deeper research and structured findings", symbol: "scope", actionID: "chatToolResearch")
                        toolRow("Write / Edit", description: "Write, rewrite, improve, or edit text", symbol: "pencil.and.outline", actionID: "chatToolWriteEdit")
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)
                }
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .foregroundStyle(.primary)
        .background {
            BlueMindDarkAttachmentSheetMaterial()
                .overlay(Color.black.opacity(0.07))
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(.white.opacity(0.055))
                        .frame(height: 0.5)
                }
                .ignoresSafeArea()
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !selectedPhotoIDs.isEmpty {
                Button {
                    let selected = selectedPhotoIDs.compactMap { id in
                        recentPhotos.items.first(where: { $0.id == id })
                    }
                    confirmPhotos(selected)
                } label: {
                    Text("Add \(selectedPhotoIDs.count)")
                        .font(.body.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 46)
                        .background(Color(uiColor: .systemBlue), in: Capsule())
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                .padding(.top, 6)
                .padding(.bottom, 4)
                .accessibilityLabel("Attach \(selectedPhotoIDs.count) selected photos")
            }
        }
        .onAppear { recentPhotos.load() }
    }

    private func selectionOrder(for item: BlueMindRecentPhotos.Item) -> Int? {
        selectedPhotoIDs.firstIndex(of: item.id).map { $0 + 1 }
    }

    private func togglePhoto(_ item: BlueMindRecentPhotos.Item) {
        if let index = selectedPhotoIDs.firstIndex(of: item.id) {
            selectedPhotoIDs.remove(at: index)
        } else if selectedPhotoIDs.count < 6 {
            selectedPhotoIDs.append(item.id)
        }
    }

    @ViewBuilder
    private func selectionBadge(for item: BlueMindRecentPhotos.Item) -> some View {
        if let order = selectionOrder(for: item) {
            Text("\(order)")
                .font(.caption2.bold())
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(Color(uiColor: .systemBlue), in: Circle())
                .overlay(Circle().stroke(.white.opacity(0.9), lineWidth: 1.3))
        } else {
            Circle()
                .fill(.black.opacity(0.28))
                .frame(width: 23, height: 23)
                .overlay(Circle().stroke(.white.opacity(0.88), lineWidth: 1.4))
        }
    }

    private func cameraTile(action tileAction: @escaping () -> Void) -> some View {
        Button(action: tileAction) {
            Image(systemName: "camera")
                .font(.system(size: 29, weight: .regular))
                .frame(width: tileSize, height: tileSize)
                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 17))
                .overlay {
                    RoundedRectangle(cornerRadius: 17, style: .continuous)
                        .stroke(.white.opacity(0.12), lineWidth: 0.75)
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Camera")
    }

    private func permissionTile(action tileAction: @escaping () -> Void) -> some View {
        Button(action: tileAction) {
            Image(systemName: "photo.badge.exclamationmark")
                .font(.system(size: 29, weight: .medium))
                .frame(width: tileSize, height: tileSize)
                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 17))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Allow Photos")
    }

    private func toolRow(_ title: String, description: String, symbol: String, actionID: String) -> some View {
        Button { action(actionID) } label: {
            HStack(spacing: 13) {
                Image(systemName: symbol)
                    .font(.system(size: 19, weight: .regular))
                    .foregroundStyle(.white.opacity(0.88))
                    .frame(width: 34, height: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.body.weight(.semibold))
                    Text(description).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer(minLength: 6)
            }
            .frame(minHeight: 55)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

@available(iOS 26.0, *)
private struct BlueMindCircularGlassAction: ViewModifier {
    let isDark: Bool

    func body(content: Content) -> some View {
        content
            .frame(width: 46, height: 46)
            .glassEffect(.regular.interactive(), in: Circle())
            .shadow(color: .black.opacity(isDark ? 0.30 : 0.14), radius: 12, y: 7)
    }
}

@available(iOS 26.0, *)
private extension View {
    func blueMindCircularGlassAction(isDark: Bool) -> some View {
        modifier(BlueMindCircularGlassAction(isDark: isDark))
    }
}

struct BlueMindNativeActionControl: Identifiable, Equatable {
    let id: String
    let symbol: String
    let label: String
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
}

struct BlueMindNativeScheduleItem: Identifiable, Equatable {
    let id: String
    let title: String
    let detail: String
    let symbol: String
}

struct BlueMindNativePrivateChatItem: Identifiable, Equatable {
    let id: String
    let name: String
}

@available(iOS 26.0, *)
private struct BlueMindChatEntrySheet: View {
    enum Kind { case hidden, privateChats }

    let kind: Kind
    let privateChats: [BlueMindNativePrivateChatItem]
    let isDark: Bool
    let action: (String, String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                HStack(spacing: 11) {
                    Image(systemName: kind == .hidden ? "eyeglasses" : "lock.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color.accentColor)
                    Text(kind == .hidden ? "Hidden Chat" : "Private Chat")
                        .font(.system(size: 20, weight: .bold))
                }
                HStack {
                    Spacer()
                    Button { action("close", "") } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 17, weight: .semibold))
                            .blueMindCircularGlassAction(isDark: isDark)
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityLabel("Close")
                }
            }
            .frame(height: 62)

            Text(kind == .hidden
                 ? "This chat is temporary. Messages are not saved, do not appear in History or Search, and are deleted when you leave."
                 : "Open or create a protected private chat inside your account.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 8)
                .padding(.bottom, 20)

            if kind == .privateChats {
                if privateChats.isEmpty {
                    ContentUnavailableView("No private chats yet", systemImage: "lock", description: Text("Create one to keep conversations protected."))
                        .frame(height: 112)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 1) {
                            ForEach(privateChats) { chat in
                                HStack(spacing: 10) {
                                    Button { action("select", chat.id) } label: {
                                        HStack(spacing: 10) {
                                        Image(systemName: "lock.fill")
                                            .font(.system(size: 14, weight: .semibold))
                                            .frame(width: 32, height: 32)
                                            .glassEffect(.regular, in: Circle())
                                        Text(chat.name)
                                            .font(.system(size: 15, weight: .semibold))
                                            .lineLimit(1)
                                        Spacer()
                                        }
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    Menu {
                                        Button { action("rename", chat.id) } label: { Label("Rename", systemImage: "pencil") }
                                        Button { action("changePin", chat.id) } label: { Label("Change PIN", systemImage: "key") }
                                        Button(role: .destructive) { action("delete", chat.id) } label: { Label("Delete", systemImage: "trash") }
                                    } label: {
                                        Image(systemName: "ellipsis")
                                            .font(.system(size: 16, weight: .semibold))
                                            .blueMindCircularGlassAction(isDark: isDark)
                                    }
                                    .buttonStyle(BlueMindHeaderButtonStyle())
                                }
                                .padding(.leading, 10)
                                .padding(.trailing, 5)
                                .frame(minHeight: 52)
                                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))
                                if chat.id != privateChats.last?.id {
                                    Divider().padding(.leading, 52)
                                }
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .frame(maxHeight: 230)
                }
            }

            VStack(spacing: 9) {
                Button {
                    action(kind == .hidden ? "start" : "create", "")
                } label: {
                    Text(kind == .hidden ? "Start Hidden Chat" : "Create Private Chat")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.accentColor)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))
                }
                .buttonStyle(BlueMindHeaderButtonStyle())
                Button { action("close", "") } label: {
                    Text("Cancel")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))
                }
                .buttonStyle(BlueMindHeaderButtonStyle())
            }
            .padding(.top, 14)
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 16)
        .glassEffect(.regular, in: .rect(cornerRadius: 30))
        .preferredColorScheme(isDark ? .dark : .light)
    }
}

private final class BlueMindChatSheetDismissDelegate: NSObject, UIAdaptivePresentationControllerDelegate {
    private var handled = false
    let onDismiss: () -> Void

    init(onDismiss: @escaping () -> Void) { self.onDismiss = onDismiss }
    func markHandled() { handled = true }
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard !handled else { return }
        handled = true
        onDismiss()
    }
}

@available(iOS 26.0, *)
private struct BlueMindAllSchedulesSheet: View {
    let items: [BlueMindNativeScheduleItem]
    let isDark: Bool
    let action: (String, String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Text("All schedules")
                    .font(.system(size: 17, weight: .bold))
                HStack {
                    Spacer()
                    Button { action("close", "") } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 17, weight: .semibold))
                            .blueMindCircularGlassAction(isDark: isDark)
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityLabel("Close All schedules")
                }
            }
            .frame(height: 58)
            .padding(.horizontal, 20)

            Text("Sorted by date and time automatically.")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.bottom, 14)

            if items.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 30, weight: .medium))
                        .foregroundStyle(.secondary)
                    Text("No schedules yet")
                        .font(.system(size: 16, weight: .bold))
                    Text("Use the + button to add your first schedule.")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.bottom, 52)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(items) { item in
                            HStack(spacing: 12) {
                                Image(systemName: item.symbol)
                                    .font(.system(size: 18, weight: .semibold))
                                    .frame(width: 44, height: 44)
                                    .foregroundStyle(.white)
                                    .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(item.title)
                                        .font(.system(size: 15, weight: .bold))
                                        .lineLimit(1)
                                    Text(item.detail)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                Menu {
                                    Button { action("edit", item.id) } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    Button(role: .destructive) { action("delete", item.id) } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                } label: {
                                    Image(systemName: "ellipsis")
                                        .font(.system(size: 18, weight: .semibold))
                                        .blueMindCircularGlassAction(isDark: isDark)
                                }
                                .buttonStyle(BlueMindHeaderButtonStyle())
                                .accessibilityLabel("Actions for \(item.title)")
                            }
                            .padding(12)
                            .background(
                                (isDark ? Color(red: 31/255, green: 31/255, blue: 33/255) : Color(uiColor: .secondarySystemBackground))
                                    .opacity(isDark ? 0.94 : 1),
                                in: RoundedRectangle(cornerRadius: 24, style: .continuous)
                            )
                            .overlay {
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(isDark ? Color.white.opacity(0.085) : Color.black.opacity(0.08), lineWidth: 1)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(isDark ? Color(red: 18/255, green: 18/255, blue: 19/255) : Color(uiColor: .systemBackground))
        .preferredColorScheme(isDark ? .dark : .light)
    }
}

@objc(BlueMindNativeVoicePlugin)
final class BlueMindNativeVoicePlugin: CAPPlugin, CAPBridgedPlugin, AVAudioRecorderDelegate {
    let identifier = "BlueMindNativeVoicePlugin"
    let jsName = "BlueMindNativeVoice"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    private var recorder: AVAudioRecorder?
    private var meterTimer: Timer?
    private var recordingURL: URL?
    private var pendingStop: (call: CAPPluginCall, url: URL, duration: TimeInterval)?
    private var smoothedLevel: Float = 0.08
    private var observers: [NSObjectProtocol] = []
    private let setupQueue = DispatchQueue(label: "ai.bluemind.voice.setup", qos: .userInitiated)
    private var startGeneration = 0

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.recorder == nil else {
                call.resolve(["recording": true])
                return
            }
            self.startGeneration += 1
            let generation = self.startGeneration
            self.requestMicrophonePermission { allowed in
                DispatchQueue.main.async {
                    guard allowed else {
                        call.reject("Microphone permission is required for voice input.", "MICROPHONE_PERMISSION_DENIED")
                        return
                    }
                    self.setupQueue.async {
                        do {
                            try self.beginRecording()
                            DispatchQueue.main.async {
                                guard generation == self.startGeneration else {
                                    self.finishRecording(discard: true)
                                    call.reject("Voice recording was cancelled.", "MICROPHONE_START_CANCELLED")
                                    return
                                }
                                self.startMetering()
                                call.resolve(["recording": true])
                            }
                        } catch {
                            DispatchQueue.main.async {
                                self.finishRecording(discard: true)
                                call.reject("Unable to start microphone capture.", "MICROPHONE_START_FAILED", error)
                            }
                        }
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startGeneration += 1
            guard let url = self.recordingURL, self.recorder != nil else {
                call.resolve(["base64": "", "mimeType": "audio/mp4"])
                return
            }
            let duration = self.recorder?.currentTime ?? 0
            self.meterTimer?.invalidate()
            self.meterTimer = nil
            self.removeInterruptionObservers()
            self.pendingStop = (call, url, duration)
            self.recorder?.stop()
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startGeneration += 1
            self.finishRecording(discard: true)
            call.resolve()
        }
    }

    private func requestMicrophonePermission(_ completion: @escaping (Bool) -> Void) {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted: completion(true)
            case .denied: completion(false)
            case .undetermined: AVAudioApplication.requestRecordPermission(completionHandler: completion)
            @unknown default: completion(false)
            }
        } else {
            switch AVAudioSession.sharedInstance().recordPermission {
            case .granted: completion(true)
            case .denied: completion(false)
            case .undetermined: AVAudioSession.sharedInstance().requestRecordPermission(completion)
            @unknown default: completion(false)
            }
        }
    }

    private func beginRecording() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("bluemind-voice-\(UUID().uuidString)")
            .appendingPathExtension("m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44_100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 96_000,
        ]
        let nextRecorder = try AVAudioRecorder(url: url, settings: settings)
        nextRecorder.delegate = self
        nextRecorder.isMeteringEnabled = true
        guard nextRecorder.prepareToRecord(), nextRecorder.record() else {
            throw NSError(domain: "BlueMindVoice", code: 1)
        }
        recorder = nextRecorder
        recordingURL = url
        smoothedLevel = 0.08
    }

    private func startMetering() {
        installInterruptionObservers()
        meterTimer = Timer.scheduledTimer(withTimeInterval: 0.06, repeats: true) { [weak self] _ in
            self?.publishMeterLevel()
        }
    }

    private func publishMeterLevel() {
        guard let recorder else { return }
        recorder.updateMeters()
        let decibels = recorder.averagePower(forChannel: 0)
        let linear = pow(10, decibels / 20)
        let normalized = max(0.06, min(1, sqrt(linear) * 1.8))
        smoothedLevel += (normalized - smoothedLevel) * (normalized > smoothedLevel ? 0.46 : 0.24)
        notifyListeners("meter", data: ["level": smoothedLevel])
    }

    private func installInterruptionObservers() {
        removeInterruptionObservers()
        let center = NotificationCenter.default
        for name in [AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification, UIApplication.didEnterBackgroundNotification] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] note in
                guard let self, self.recorder != nil else { return }
                if name == AVAudioSession.routeChangeNotification,
                   let reasonValue = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                   AVAudioSession.RouteChangeReason(rawValue: reasonValue) != .oldDeviceUnavailable { return }
                self.finishRecording(discard: true)
                self.notifyListeners("interrupted", data: ["reason": name.rawValue])
            })
        }
    }

    private func finishRecording(discard: Bool) {
        meterTimer?.invalidate()
        meterTimer = nil
        if discard, let pendingStop {
            pendingStop.call.reject("Voice recording was cancelled.", "VOICE_RECORDING_CANCELLED")
            self.pendingStop = nil
        }
        if discard { recorder?.delegate = nil }
        recorder?.stop()
        recorder = nil
        removeInterruptionObservers()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        if discard, let url = recordingURL { try? FileManager.default.removeItem(at: url) }
        if discard { recordingURL = nil }
    }

    private func removeInterruptionObservers() {
        observers.forEach(NotificationCenter.default.removeObserver)
        observers.removeAll()
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let pendingStop {
            pendingStop.call.reject("The voice recording could not be finalized.", "VOICE_RECORDING_FINALIZE_FAILED", error)
            self.pendingStop = nil
        }
        finishRecording(discard: true)
        notifyListeners("interrupted", data: ["reason": "encodeError"])
    }

    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        guard let pendingStop else { return }
        self.pendingStop = nil
        self.recorder = nil
        self.recordingURL = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        guard flag else {
            try? FileManager.default.removeItem(at: pendingStop.url)
            pendingStop.call.reject("The voice recording could not be finalized.", "VOICE_RECORDING_FINALIZE_FAILED")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let data = try Data(contentsOf: pendingStop.url, options: .mappedIfSafe)
                try? FileManager.default.removeItem(at: pendingStop.url)
                guard data.count >= 512 else {
                    throw NSError(
                        domain: "BlueMindVoice",
                        code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "The finalized recording is empty."]
                    )
                }
                let encoded = data.base64EncodedString()
                DispatchQueue.main.async {
                    pendingStop.call.resolve([
                        "base64": encoded,
                        "mimeType": "audio/mp4",
                        "size": data.count,
                        "duration": pendingStop.duration,
                    ])
                }
            } catch {
                try? FileManager.default.removeItem(at: pendingStop.url)
                DispatchQueue.main.async {
                    pendingStop.call.reject("Unable to read the finalized voice recording.", "VOICE_RECORDING_READ_FAILED", error)
                }
            }
        }
    }
}

@MainActor
final class BlueMindGlassModel: ObservableObject {
    @Published var isVisible = false
    @Published var isAuthBackVisible = false
    @Published var isSettingsCloseVisible = false
    @Published var settingsPresentationOffsetY: CGFloat = 0
    @Published var isSettingsBackVisible = false
    @Published var isRemindersHeaderVisible = false
    @Published var isReminderFormCloseVisible = false
    @Published var isScheduleHeaderVisible = false
    @Published var nativeActionControls: [BlueMindNativeActionControl] = []
    @Published var isStudioComposerVisible = false
    @Published var studioText = ""
    @Published var studioPlaceholder = "Describe what you want to create…"
    @Published var studioCanGenerate = false
    @Published var studioPrimaryColor = Color(red: 25 / 255, green: 59 / 255, blue: 104 / 255)
    @Published var text = ""
    @Published var canSend = false
    @Published var isSending = false
    @Published var isListening = false
    @Published var voiceStatus = "idle"
    @Published var voiceTranscript = ""
    @Published var audioLevels: [Double] = []
    @Published var audioVisualizationFrame: UInt64 = 0
    @Published var attachments: [BlueMindGlassAttachment] = []
    @Published var isUploadingAttachments = false
    @Published var isComposerVisible = true
    @Published var isHeaderVisible = true
    @Published var isMenuOpen = false
    @Published var isDark = true
    @Published var isRTL = false
    @Published var accentColor = Color(red: 25 / 255, green: 59 / 255, blue: 104 / 255)
    @Published var brandPrimaryColor: Color?
    @Published var selectedMode = "general"
    @Published var modes = [BlueMindGlassMode(id: "general", title: "General AI")]
    @Published var selectedModel = "bluemind-5-0"
    @Published var models = [BlueMindGlassModelOption(id: "bluemind-5-0", title: "BlueMind 5.0", badge: "NEW")]
    @Published var thinkingEnabled = false
    @Published var isWritingMode = false
    @Published var isAIPlanMode = false
    @Published var chatSessionMode = "normal"
    @Published var modeStatusTitle = ""
    @Published var modeExitTitle = ""
    @Published var composerPlaceholder = "Ask anything…"
    @Published var headerTitlePrefix = ""
    @Published var quickActions: [String] = []
    var attachmentSignature = ""
    var lastTextEventID: UInt64 = 0
    var lastModeEventID: UInt64 = 0
    var lastMenuEventID: UInt64 = 0

    var currentMode: BlueMindGlassMode {
        modes.first(where: { $0.id == selectedMode }) ?? modes[0]
    }
}

@MainActor
private final class BlueMindStudioCustomizeViewController: UITableViewController, UIAdaptivePresentationControllerDelegate {
    struct Group {
        let id: String
        let title: String
        let options: [String]
    }

    private let groups: [Group]
    private var values: [String: String]
    private let completion: ([String: String]?) -> Void
    private var completed = false
    private let initialGroupID: String?

    init(title: String, groups: [Group], values: [String: String], initialGroupID: String?, completion: @escaping ([String: String]?) -> Void) {
        self.groups = groups
        self.values = values
        self.completion = completion
        self.initialGroupID = initialGroupID
        super.init(style: .insetGrouped)
        self.title = title
    }

    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        tableView.backgroundColor = .systemBackground
        tableView.rowHeight = 52
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Cancel", style: .plain, target: self, action: #selector(cancel))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Done", style: .done, target: self, action: #selector(done))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard let initialGroupID, let section = groups.firstIndex(where: { $0.id == initialGroupID }) else { return }
        tableView.scrollToRow(at: IndexPath(row: 0, section: section), at: .middle, animated: true)
    }

    override func numberOfSections(in tableView: UITableView) -> Int { groups.count }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { 1 }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? { groups[section].title }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "studio-setting") ?? UITableViewCell(style: .value1, reuseIdentifier: "studio-setting")
        let group = groups[indexPath.section]
        cell.textLabel?.text = group.title
        cell.detailTextLabel?.text = values[group.id] ?? group.options.first
        cell.accessoryType = .disclosureIndicator
        cell.selectionStyle = .default
        return cell
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let group = groups[indexPath.section]
        let picker = UIAlertController(title: group.title, message: nil, preferredStyle: .actionSheet)
        group.options.forEach { option in
            let selected = values[group.id] == option
            let action = UIAlertAction(title: selected ? "✓  \(option)" : option, style: .default) { [weak self] _ in
                self?.values[group.id] = option
                self?.tableView.reloadSections(IndexSet(integer: indexPath.section), with: .automatic)
            }
            picker.addAction(action)
        }
        picker.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let popover = picker.popoverPresentationController, let cell = tableView.cellForRow(at: indexPath) {
            popover.sourceView = cell
            popover.sourceRect = cell.bounds
        }
        present(picker, animated: true)
    }

    @objc private func cancel() { finish(nil) }
    @objc private func done() { finish(values) }

    private func finish(_ result: [String: String]?) {
        guard !completed else { return }
        completed = true
        dismiss(animated: true) { self.completion(result) }
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard !completed else { return }
        completed = true
        completion(nil)
    }
}

@MainActor
private final class BlueMindGlobalToastPresenter {
    static let shared = BlueMindGlobalToastPresenter()

    private struct ToastItem: Equatable {
        let type: String
        let message: String
        let duration: TimeInterval
    }

    private weak var windowScene: UIWindowScene?
    private var toastWindow: UIWindow?
    private var current: ToastItem?
    private var queue: [ToastItem] = []

    func enqueue(type: String, message: String, duration: TimeInterval, scene: UIWindowScene?) {
        let cleanMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanMessage.isEmpty else { return }
        if let scene { windowScene = scene }
        let item = ToastItem(type: normalizedType(type), message: cleanMessage, duration: duration)
        guard current.map({ $0.type != item.type || $0.message != item.message }) ?? true,
              !queue.contains(where: { $0.type == item.type && $0.message == item.message }) else { return }
        queue.append(item)
        presentNextIfNeeded()
    }

    private func normalizedType(_ type: String) -> String {
        ["success", "error", "warning", "info"].contains(type) ? type : "info"
    }

    private func makeWindow() -> UIWindow? {
        guard let scene = windowScene else { return nil }
        if let toastWindow { return toastWindow }
        let window = UIWindow(windowScene: scene)
        let controller = UIViewController()
        controller.view.backgroundColor = .clear
        window.rootViewController = controller
        window.windowLevel = .alert + 1
        window.backgroundColor = .clear
        window.isUserInteractionEnabled = false
        toastWindow = window
        return window
    }

    private func presentNextIfNeeded() {
        guard current == nil, !queue.isEmpty,
              let window = makeWindow(), let root = window.rootViewController?.view else { return }
        let item = queue.removeFirst()
        current = item

        let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))
        blur.translatesAutoresizingMaskIntoConstraints = false
        blur.layer.cornerRadius = 18
        blur.layer.cornerCurve = .continuous
        blur.clipsToBounds = true
        blur.layer.borderWidth = 0.5
        blur.layer.borderColor = UIColor.white.withAlphaComponent(0.18).cgColor
        blur.layer.shadowColor = UIColor.black.cgColor
        blur.layer.shadowOpacity = 0.22
        blur.layer.shadowRadius = 16
        blur.layer.shadowOffset = CGSize(width: 0, height: 8)

        let icon = UIImageView(image: UIImage(systemName: symbol(for: item.type)))
        icon.translatesAutoresizingMaskIntoConstraints = false
        icon.tintColor = tint(for: item.type)
        icon.contentMode = .scaleAspectFit
        icon.setContentHuggingPriority(.required, for: .horizontal)

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = item.message
        label.textColor = .white
        label.font = .systemFont(ofSize: 14, weight: .semibold)
        label.numberOfLines = 3
        label.lineBreakMode = .byWordWrapping

        let stack = UIStackView(arrangedSubviews: [icon, label])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 9
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 11, leading: 13, bottom: 11, trailing: 15)
        blur.contentView.addSubview(stack)
        root.addSubview(blur)

        NSLayoutConstraint.activate([
            icon.widthAnchor.constraint(equalToConstant: 19),
            icon.heightAnchor.constraint(equalToConstant: 19),
            stack.leadingAnchor.constraint(equalTo: blur.contentView.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: blur.contentView.trailingAnchor),
            stack.topAnchor.constraint(equalTo: blur.contentView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: blur.contentView.bottomAnchor),
            blur.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            blur.topAnchor.constraint(equalTo: root.safeAreaLayoutGuide.topAnchor, constant: 12),
            blur.leadingAnchor.constraint(greaterThanOrEqualTo: root.leadingAnchor, constant: 16),
            blur.trailingAnchor.constraint(lessThanOrEqualTo: root.trailingAnchor, constant: -16),
            blur.widthAnchor.constraint(lessThanOrEqualToConstant: 360),
        ])

        window.isHidden = false
        blur.alpha = 0
        blur.transform = CGAffineTransform(translationX: 0, y: -12).scaledBy(x: 0.98, y: 0.98)
        UIView.animate(withDuration: 0.24, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
            blur.alpha = 1
            blur.transform = .identity
        } completion: { _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + item.duration) {
                UIView.animate(withDuration: 0.20, delay: 0, options: [.curveEaseIn, .beginFromCurrentState]) {
                    blur.alpha = 0
                    blur.transform = CGAffineTransform(translationX: 0, y: -8).scaledBy(x: 0.98, y: 0.98)
                } completion: { _ in
                    Task { @MainActor in
                        blur.removeFromSuperview()
                        self.current = nil
                        if self.queue.isEmpty {
                            self.toastWindow?.isHidden = true
                            self.toastWindow = nil
                        }
                        self.presentNextIfNeeded()
                    }
                }
            }
        }
    }

    private func symbol(for type: String) -> String {
        switch type {
        case "success": return "checkmark.circle.fill"
        case "error": return "exclamationmark.circle.fill"
        case "warning": return "exclamationmark.triangle.fill"
        default: return "info.circle.fill"
        }
    }

    private func tint(for type: String) -> UIColor {
        switch type {
        case "success": return .systemGreen
        case "error": return .systemRed
        case "warning": return .systemOrange
        default: return UIColor(red: 25 / 255, green: 59 / 255, blue: 104 / 255, alpha: 1)
        }
    }
}

@objc(BlueMindNativeGlassPlugin)
final class BlueMindNativeGlassPlugin: CAPPlugin, CAPBridgedPlugin {
    static let auditBuild = "BM-AUDIT-20260827-1600-5d0271b-dirty"
    let identifier = "BlueMindNativeGlassPlugin"
    let jsName = "BlueMindNativeGlass"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setScreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAuthBackVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSettingsCloseVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSettingsPresentation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSettingsBackVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRemindersHeaderVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setReminderFormCloseVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setScheduleHeaderVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setNativeActionControls", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStudioSegmentedControl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStudioComposer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showGlobalToast", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentAllSchedules", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentChatEntrySheet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAppLanguage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "notificationAuthorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentSelection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentStudioCustomize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentConfirmation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentSecurePrompt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentChatAttachmentSheet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentWritingAttachmentPicker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAudioLevels", returnType: CAPPluginReturnPromise)
    ]

    @MainActor let model = BlueMindGlassModel()
    @MainActor private var nextEventID: UInt64 = 0
    @MainActor private var activeScreen = "none"
    @MainActor private var chatRequestsVisibility = false
    @MainActor private var authBackOwner: String?
    @MainActor private weak var selectionAnchorButton: UIButton?
    @MainActor private var writingAttachmentSource = ""
    @MainActor private var chatSheetDismissDelegate: BlueMindChatSheetDismissDelegate?
    @MainActor private weak var chatAttachmentSheetHost: UIViewController?
    @MainActor private weak var blueMindPhotosHost: UIViewController?
    @MainActor private var studioSegmentedControls: [String: UISegmentedControl] = [:]
    @MainActor private var studioSegmentIDs: [String: [String]] = [:]

    @MainActor var requiresProtectedAppSwitcherSnapshot: Bool {
        activeScreen == "chat" && (model.chatSessionMode == "hidden" || model.chatSessionMode == "private")
    }

    @MainActor private func presentationController() -> UIViewController? {
        var controller = bridge?.viewController
        while let presented = controller?.presentedViewController {
            controller = presented
        }
        return controller
    }

    @objc func showGlobalToast(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "info"
        let message = call.getString("message") ?? ""
        let requestedDuration = call.getDouble("duration") ?? (type == "error" ? 3.5 : 2.6)
        DispatchQueue.main.async {
            let scene = self.bridge?.viewController?.view.window?.windowScene
                ?? UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .first(where: { $0.activationState == .foregroundActive })
            BlueMindGlobalToastPresenter.shared.enqueue(
                type: type,
                message: message,
                duration: min(max(requestedDuration, 1.5), 6),
                scene: scene
            )
            call.resolve()
        }
    }

    @objc func setStudioSegmentedControl(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let controlID = call.getString("controlID") ?? "studio-sections"
            let visible = call.getBool("visible") ?? false
            guard visible else {
                self.studioSegmentedControls.removeValue(forKey: controlID)?.removeFromSuperview()
                self.studioSegmentIDs.removeValue(forKey: controlID)
                call.resolve(["visible": false])
                return
            }
            guard let rootView = self.bridge?.viewController?.view else {
                call.reject("Studio segmented control host is unavailable", "STUDIO_SEGMENT_HOST_UNAVAILABLE")
                return
            }
            let items = call.getArray("items", JSObject.self) ?? []
            let ids = items.compactMap { $0["id"] as? String }
            let labels = items.compactMap { $0["label"] as? String }
            guard ids.count == labels.count, !ids.isEmpty else {
                call.reject("Studio segmented control items are invalid", "STUDIO_SEGMENT_ITEMS_INVALID")
                return
            }
            let control: UISegmentedControl
            if let existing = self.studioSegmentedControls[controlID], self.studioSegmentIDs[controlID] == ids {
                control = existing
            } else {
                self.studioSegmentedControls.removeValue(forKey: controlID)?.removeFromSuperview()
                control = UISegmentedControl(items: labels)
                control.addTarget(self, action: #selector(self.studioSegmentChanged(_:)), for: .valueChanged)
                control.apportionsSegmentWidthsByContent = false
                control.setTitleTextAttributes([.font: UIFont.systemFont(ofSize: 12, weight: .semibold)], for: .normal)
                rootView.addSubview(control)
                self.studioSegmentedControls[controlID] = control
                self.studioSegmentIDs[controlID] = ids
            }
            let frame = call.getObject("frame") ?? [:]
            control.frame = CGRect(
                x: CGFloat((frame["x"] as? NSNumber)?.doubleValue ?? 16),
                y: CGFloat((frame["y"] as? NSNumber)?.doubleValue ?? 80),
                width: CGFloat((frame["width"] as? NSNumber)?.doubleValue ?? 360),
                height: CGFloat((frame["height"] as? NSNumber)?.doubleValue ?? 40)
            )
            control.selectedSegmentTintColor = UIColor(Color(hex: call.getString("primaryColor") ?? "#193B68"))
            control.selectedSegmentIndex = min(max(call.getInt("selectedIndex") ?? 0, 0), labels.count - 1)
            control.overrideUserInterfaceStyle = .dark
            control.accessibilityLabel = call.getString("ariaLabel") ?? "BlueMind Studio sections"
            rootView.bringSubviewToFront(control)
            call.resolve(["visible": true])
        }
    }

    @objc func setStudioComposer(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isStudioComposerVisible = false
                call.resolve(["visible": false])
                return
            }
            let visible = call.getBool("visible") ?? false
            self.model.isStudioComposerVisible = visible
            if visible {
                let text = call.getString("text") ?? ""
                if self.model.studioText != text { self.model.studioText = text }
                self.model.studioPlaceholder = call.getString("placeholder") ?? "Describe what you want to create…"
                self.model.studioCanGenerate = call.getBool("canGenerate") ?? false
                self.model.studioPrimaryColor = Color(hex: call.getString("primaryColor") ?? "#193B68")
            }
            call.resolve(["visible": self.model.isStudioComposerVisible])
        }
    }

    @MainActor @objc private func studioSegmentChanged(_ sender: UISegmentedControl) {
        guard let controlID = studioSegmentedControls.first(where: { $0.value === sender })?.key,
              let ids = studioSegmentIDs[controlID],
              sender.selectedSegmentIndex >= 0,
              sender.selectedSegmentIndex < ids.count else { return }
        notifyListeners("action", data: [
            "action": "studioSection",
            "controlID": controlID,
            "value": ids[sender.selectedSegmentIndex],
            "index": sender.selectedSegmentIndex,
            "nativeBuild": Self.auditBuild,
        ])
    }

    private func emitSettingsAction(_ action: String, requestID: String, extra: [String: Any] = [:]) {
        var data: [String: Any] = [
            "action": action,
            "requestId": requestID,
            "nativeBuild": Self.auditBuild,
        ]
        extra.forEach { data[$0.key] = $0.value }
        notifyListeners("action", data: data)
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            call.resolve(["supported": true, "auditBuild": Self.auditBuild])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("The app Settings URL is unavailable", "APP_SETTINGS_URL_UNAVAILABLE")
                return
            }

            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("Unable to open the app Settings page", "APP_SETTINGS_OPEN_FAILED")
                }
            }
        }
    }

    @objc func getAppLanguage(_ call: CAPPluginCall) {
        let language = Locale.preferredLanguages.first
            ?? Bundle.main.preferredLocalizations.first
            ?? "en"
        call.resolve(["language": language])
    }

    @objc func presentWritingAttachmentPicker(_ call: CAPPluginCall) {
        let source = call.getString("source") ?? ""
        DispatchQueue.main.async {
            guard ["camera", "photos", "files"].contains(source), let presenter = self.presentationController() else {
                call.reject("The requested attachment source is unavailable", "ATTACHMENT_SOURCE_UNAVAILABLE")
                return
            }
            self.writingAttachmentSource = source
            self.bridge?.viewController?.view.endEditing(true)

            let controller: UIViewController
            switch source {
            case "camera":
                guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                    call.reject("Camera is unavailable", "CAMERA_UNAVAILABLE")
                    return
                }
                let picker = UIImagePickerController()
                picker.sourceType = .camera
                picker.mediaTypes = [UTType.image.identifier]
                picker.delegate = self
                picker.modalPresentationStyle = .fullScreen
                controller = picker
            case "photos":
                var configuration = PHPickerConfiguration(photoLibrary: .shared())
                configuration.filter = .images
                configuration.selectionLimit = 10
                let picker = PHPickerViewController(configuration: configuration)
                picker.delegate = self
                picker.modalPresentationStyle = .pageSheet
                controller = picker
            default:
                let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.image, .pdf, .plainText, .data], asCopy: true)
                picker.allowsMultipleSelection = true
                picker.delegate = self
                picker.modalPresentationStyle = .pageSheet
                controller = picker
            }

            presenter.present(controller, animated: true) { call.resolve() }
        }
    }

    @objc func presentChatAttachmentSheet(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *), let presenter = self.presentationController() else {
                call.reject("The native chat attachment sheet is unavailable", "CHAT_ATTACHMENT_SHEET_UNAVAILABLE")
                return
            }
            guard self.chatAttachmentSheetHost == nil else {
                call.resolve(["presented": true])
                return
            }

            self.bridge?.viewController?.view.endEditing(true)
            let recentPhotos = BlueMindRecentPhotos()
            let root = BlueMindChatAttachmentSheet(
                recentPhotos: recentPhotos,
                action: { [weak self] actionID in
                    if actionID == "chatAttachmentCamera" {
                        self?.presentCameraDirectlyFromChatAttachmentSheet()
                    } else if actionID == "chatAttachmentPhotos" {
                        self?.presentBlueMindPhotosFromChatAttachmentSheet()
                    } else if actionID == "chatAttachmentFiles" {
                        self?.presentFilesDirectlyFromChatAttachmentSheet()
                    } else {
                        self?.finishChatAttachmentSheet(actionID: actionID)
                    }
                },
                confirmPhotos: { [weak self] items in self?.attachRecentPhotos(items) }
            )
            .preferredColorScheme(.dark)

            let controller = UIHostingController(rootView: root)
            controller.view.backgroundColor = .clear
            controller.modalPresentationStyle = .pageSheet
            if let sheet = controller.sheetPresentationController {
                let identifier = UISheetPresentationController.Detent.Identifier("blueMindChatAttachments")
                sheet.detents = [
                    .custom(identifier: identifier) { context in context.maximumDetentValue * 0.64 }
                ]
                sheet.selectedDetentIdentifier = identifier
                sheet.prefersGrabberVisible = false
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.prefersEdgeAttachedInCompactHeight = true
                sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = false
                sheet.preferredCornerRadius = 30
                sheet.largestUndimmedDetentIdentifier = nil
            }
            self.chatAttachmentSheetHost = controller
            presenter.present(controller, animated: true) {
                if let container = controller.presentationController?.containerView {
                    let tap = UITapGestureRecognizer(target: self, action: #selector(self.dismissChatAttachmentFromBackdrop(_:)))
                    tap.cancelsTouchesInView = false
                    container.addGestureRecognizer(tap)
                }
                call.resolve(["presented": true])
            }
        }
    }

    @objc @MainActor private func dismissChatAttachmentFromBackdrop(_ recognizer: UITapGestureRecognizer) {
        guard recognizer.state == .ended,
              let host = chatAttachmentSheetHost,
              let container = host.presentationController?.containerView else { return }
        let location = recognizer.location(in: container)
        guard !host.view.frame.contains(location) else { return }
        chatAttachmentSheetHost = nil
        host.dismiss(animated: true)
    }

    @available(iOS 26.0, *)
    @MainActor
    private func finishChatAttachmentSheet(actionID: String) {
        let host = chatAttachmentSheetHost
        chatAttachmentSheetHost = nil
        host?.dismiss(animated: true) { [weak self] in
            self?.emit(actionID)
        }
    }

    @available(iOS 26.0, *)
    @MainActor
    private func presentCameraDirectlyFromChatAttachmentSheet() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            finishChatAttachmentSheet(actionID: "chatAttachmentCamera")
            return
        }

        let startedAt = CACurrentMediaTime()
        let host = chatAttachmentSheetHost
        let presenter = host?.presentingViewController ?? presentationController()
        chatAttachmentSheetHost = nil
        writingAttachmentSource = "camera"

        // A non-animated sheet teardown avoids waiting for its dismissal transition and
        // lets the native camera begin its own full-screen transition on the same tap.
        host?.dismiss(animated: false) { [weak self, weak presenter] in
            guard let self, let presenter else { return }
            let camera = BlueMindCameraViewController(primaryColor: UIColor(self.model.brandPrimaryColor ?? self.model.accentColor))
            camera.modalPresentationStyle = .fullScreen
            camera.onCancel = { [weak camera] in camera?.dismiss(animated: true) }
            camera.onUsePhoto = { [weak self, weak camera] image, data in
                guard let self, let camera else { return }
                self.acceptChatCameraPhoto(image: image, originalData: data, from: camera)
            }
#if DEBUG
            print("[BlueMindCameraTiming] tap-to-present-call-ms=\(Int((CACurrentMediaTime() - startedAt) * 1000))")
#endif
            presenter.present(camera, animated: true) {
#if DEBUG
                print("[BlueMindCameraTiming] tap-to-camera-visible-ms=\(Int((CACurrentMediaTime() - startedAt) * 1000))")
#endif
            }
        }
    }

    @available(iOS 26.0, *)
    @MainActor
    private func presentBlueMindPhotosFromChatAttachmentSheet() {
        guard blueMindPhotosHost == nil else { return }
        let sheetHost = chatAttachmentSheetHost
        let presenter = sheetHost?.presentingViewController ?? presentationController()
        guard let presenter else { return }
        chatAttachmentSheetHost = nil

        let library = BlueMindPhotoLibrary()
        let accent = model.brandPrimaryColor ?? model.accentColor
        let root = BlueMindPhotosPickerView(
            library: library,
            accentColor: accent,
            cancel: { [weak self] in
                guard let self else { return }
                let host = self.blueMindPhotosHost
                self.blueMindPhotosHost = nil
                host?.dismiss(animated: true)
            },
            manageLimitedAccess: { [weak self] in
                guard let host = self?.blueMindPhotosHost else { return }
                PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: host)
            },
            openSettings: {
                guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                UIApplication.shared.open(url)
            },
            confirm: { [weak self] items in
                guard let self else { return }
                let host = self.blueMindPhotosHost
                self.blueMindPhotosHost = nil
                host?.dismiss(animated: true) { [weak self] in
                    self?.attachRecentPhotos(items)
                }
            }
        )

        let controller = UIHostingController(rootView: root)
        controller.view.backgroundColor = .clear
        controller.modalPresentationStyle = .pageSheet
        if let sheet = controller.sheetPresentationController {
            sheet.detents = [.large()]
            sheet.selectedDetentIdentifier = .large
            sheet.prefersGrabberVisible = true
            sheet.prefersScrollingExpandsWhenScrolledToEdge = false
            sheet.prefersEdgeAttachedInCompactHeight = true
            sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = false
            sheet.preferredCornerRadius = 28
        }
        blueMindPhotosHost = controller

        // Tear down only the attachment sheet presentation; the chat and composer
        // remain mounted underneath and retain their draft/attachment state.
        sheetHost?.dismiss(animated: false) { [weak self, weak presenter] in
            guard let self, let presenter else { return }
            presenter.present(controller, animated: true)
        }
    }

    @available(iOS 26.0, *)
    @MainActor
    private func presentFilesDirectlyFromChatAttachmentSheet() {
        let sheetHost = chatAttachmentSheetHost
        let presenter = sheetHost?.presentingViewController ?? presentationController()
        guard let presenter else { return }
        chatAttachmentSheetHost = nil
        writingAttachmentSource = "files"
        let picker = UIDocumentPickerViewController(
            forOpeningContentTypes: [.image, .pdf, .plainText, .data],
            asCopy: true
        )
        picker.allowsMultipleSelection = true
        picker.delegate = self
        picker.modalPresentationStyle = .pageSheet
        sheetHost?.dismiss(animated: false) { [weak presenter] in
            presenter?.present(picker, animated: true)
        }
    }

    @available(iOS 26.0, *)
    @MainActor
    private func acceptChatCameraPhoto(image: UIImage, originalData: Data, from camera: UIViewController) {
        let startedAt = CACurrentMediaTime()
        let clientID = "local-camera-\(UUID().uuidString)"
        let name = "Camera-\(Int(Date().timeIntervalSince1970)).jpg"
        camera.dismiss(animated: true)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            autoreleasepool {
                let thumbnail = image.preparingThumbnail(of: CGSize(width: 360, height: 360)) ?? image
                guard let previewData = thumbnail.jpegData(compressionQuality: 0.78) else { return }
                Task { @MainActor [weak self] in
                    self?.emitNativeAttachmentPreviews([[
                        "id": clientID,
                        "name": name,
                        "mimeType": "image/jpeg",
                        "previewBase64": previewData.base64EncodedString(),
                        "assetIdentifier": "",
                        "uploadState": "uploading",
                    ]], source: "camera")
                }

                var payload = self?.attachmentPayload(data: originalData, name: name, mimeType: "image/jpeg") ?? [:]
                payload["clientId"] = clientID
                Task { @MainActor [weak self] in
                    self?.emitWritingAttachments([payload], source: "camera")
#if DEBUG
                    let width = image.cgImage?.width ?? Int(image.size.width * image.scale)
                    let height = image.cgImage?.height ?? Int(image.size.height * image.scale)
                    print("[BlueMindCameraTiming] use-photo-to-preview-ms=\(Int((CACurrentMediaTime() - startedAt) * 1000)) original-pixels=\(width)x\(height) original-bytes=\(originalData.count)")
#endif
                }
            }
        }
    }

    @available(iOS 26.0, *)
    @MainActor
    private func attachRecentPhotos(_ items: [BlueMindRecentPhotos.Item]) {
        guard !items.isEmpty else { return }
        let host = chatAttachmentSheetHost
        chatAttachmentSheetHost = nil
        host?.dismiss(animated: true)

        let selections = items.enumerated().map { index, item in
            (
                item: item,
                clientID: "local-photo-\(UUID().uuidString)",
                name: PHAssetResource.assetResources(for: item.asset).first?.originalFilename
                    ?? "Photo-\(index + 1)-\(Int(Date().timeIntervalSince1970)).jpg"
            )
        }
        let previews = selections.compactMap { selection -> [String: Any]? in
            guard let data = selection.item.image.jpegData(compressionQuality: 0.72) else { return nil }
            return [
                "id": selection.clientID,
                "name": selection.name,
                "mimeType": "image/jpeg",
                "previewBase64": data.base64EncodedString(),
                "assetIdentifier": selection.item.asset.localIdentifier,
                "uploadState": "uploading",
            ]
        }
        emitNativeAttachmentPreviews(previews)

        let group = DispatchGroup()
        let lock = NSLock()
        var orderedPayloads = Array<[String: Any]?>(repeating: nil, count: selections.count)

        for (index, selection) in selections.enumerated() {
            group.enter()
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .fast
            options.isNetworkAccessAllowed = true
            PHImageManager.default().requestImage(
                for: selection.item.asset,
                targetSize: CGSize(width: 2048, height: 2048),
                contentMode: .aspectFit,
                options: options
            ) { [weak self] image, info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                defer { group.leave() }
                guard let self, let data = image?.jpegData(compressionQuality: 0.84) else { return }
                var payload = self.attachmentPayload(
                    data: data,
                    name: selection.name,
                    mimeType: "image/jpeg"
                )
                payload["clientId"] = selection.clientID
                lock.lock()
                orderedPayloads[index] = payload
                lock.unlock()
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.emitWritingAttachments(orderedPayloads.compactMap { $0 }, source: "photos")
        }
    }

    @MainActor
    private func emitNativeAttachmentPreviews(_ attachments: [[String: Any]], source: String = "photos") {
        guard !attachments.isEmpty else { return }
        nextEventID &+= 1
        notifyListeners("action", data: [
            "eventId": String(nextEventID),
            "action": "chatAttachmentPreviews",
            "source": source,
            "attachments": attachments,
            "nativeBuild": Self.auditBuild,
        ])
    }

    @MainActor
    private func emitWritingAttachments(_ attachments: [[String: Any]], source: String) {
        guard !attachments.isEmpty else { return }
        nextEventID &+= 1
        notifyListeners("action", data: [
            "eventId": String(nextEventID),
            "action": "writingAttachmentsPicked",
            "source": source,
            "attachments": attachments,
            "nativeBuild": Self.auditBuild,
        ])
    }

    private func notificationStatusName(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .notDetermined: return "notDetermined"
        case .provisional: return "provisional"
        case .ephemeral: return "ephemeral"
        @unknown default: return "unknown"
        }
    }

    @objc func notificationAuthorizationStatus(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(["status": self.notificationStatusName(settings.authorizationStatus)])
        }
    }

    @objc func requestNotificationAuthorization(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error {
                call.reject(error.localizedDescription, "NOTIFICATION_AUTHORIZATION_FAILED")
                return
            }
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                call.resolve([
                    "granted": granted,
                    "status": self.notificationStatusName(settings.authorizationStatus)
                ])
            }
        }
    }

    @objc func presentSelection(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let selectedValue = call.getString("selectedValue") ?? ""
        let requestID = call.getString("requestId") ?? UUID().uuidString
        let options = call.getArray("options", JSObject.self) ?? []

        DispatchQueue.main.async {
            guard let view = self.bridge?.viewController?.view else {
                call.reject("The native presentation view is unavailable", "SELECTION_VIEW_UNAVAILABLE")
                return
            }

            self.selectionAnchorButton?.removeFromSuperview()
            let anchor = UIButton(type: .system)
            let anchorRect = call.getObject("anchorRect")
            let anchorX = (anchorRect?["x"] as? NSNumber)?.doubleValue ?? Double(view.bounds.midX - 1)
            let anchorY = (anchorRect?["y"] as? NSNumber)?.doubleValue ?? Double(view.bounds.midY - 1)
            let anchorWidth = (anchorRect?["width"] as? NSNumber)?.doubleValue ?? 2
            let anchorHeight = (anchorRect?["height"] as? NSNumber)?.doubleValue ?? 2
            anchor.frame = CGRect(
                x: CGFloat(anchorX),
                y: CGFloat(anchorY),
                width: CGFloat(max(2, anchorWidth)),
                height: CGFloat(max(2, anchorHeight))
            )
            anchor.alpha = 0.01
            anchor.showsMenuAsPrimaryAction = true
            anchor.menu = UIMenu(title: title, children: options.compactMap { option in
                guard let value = option["value"] as? String,
                      let label = option["label"] as? String else { return nil }
                let symbol = option["symbol"] as? String
                let destructive = option["destructive"] as? Bool ?? false
                return UIAction(
                    title: label,
                    image: symbol.flatMap(UIImage.init(systemName:)),
                    attributes: destructive ? .destructive : [],
                    state: value == selectedValue ? .on : .off
                ) { [weak self, weak anchor] _ in
                    self?.emitSettingsAction("settingsSelection", requestID: requestID, extra: ["value": value])
                    anchor?.removeFromSuperview()
                }
            })
            view.addSubview(anchor)
            self.selectionAnchorButton = anchor
            view.layoutIfNeeded()
            DispatchQueue.main.async {
                if #available(iOS 17.4, *) {
                    anchor.performPrimaryAction()
                } else {
                    anchor.sendActions(for: .primaryActionTriggered)
                }
            }
            call.resolve(["requestId": requestID])
        }
    }

    @objc func presentStudioCustomize(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "image"
        let focusSetting = call.getString("focusSetting")
        let rawGroups = call.getArray("groups", JSObject.self) ?? []
        let groups = rawGroups.compactMap { raw -> BlueMindStudioCustomizeViewController.Group? in
            guard let id = raw["id"] as? String,
                  let title = raw["title"] as? String,
                  let options = raw["options"] as? [String],
                  !options.isEmpty else { return nil }
            return .init(id: id, title: title, options: options)
        }
        let rawValues = call.getObject("values") ?? [:]
        let values = rawValues.reduce(into: [String: String]()) { result, entry in
            if let value = entry.value as? String { result[entry.key] = value }
        }

        DispatchQueue.main.async {
            guard !groups.isEmpty, let presenter = self.presentationController() else {
                call.reject("Studio settings are unavailable", "STUDIO_SETTINGS_UNAVAILABLE")
                return
            }
            let controller = BlueMindStudioCustomizeViewController(
                title: kind == "video" ? "Video Settings" : "Image Settings",
                groups: groups,
                values: values,
                initialGroupID: focusSetting
            ) { result in
                call.resolve(["confirmed": result != nil, "values": result ?? values])
            }
            let navigation = UINavigationController(rootViewController: controller)
            navigation.view.tintColor = UIColor(Color(hex: call.getString("primaryColor") ?? "#193B68"))
            navigation.modalPresentationStyle = .pageSheet
            navigation.presentationController?.delegate = controller
            if let sheet = navigation.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.selectedDetentIdentifier = .medium
                sheet.prefersGrabberVisible = true
                sheet.prefersEdgeAttachedInCompactHeight = true
            }
            presenter.present(navigation, animated: true) {
                navigation.presentationController?.delegate = controller
            }
        }
    }

    @objc func presentConfirmation(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let message = call.getString("message")
        let confirmTitle = call.getString("confirmTitle") ?? "Continue"
        let cancelTitle = call.getString("cancelTitle") ?? "Cancel"
        let destructive = call.getBool("destructive") ?? false
        let requestID = call.getString("requestId") ?? UUID().uuidString

        DispatchQueue.main.async {
            guard let presenter = self.presentationController() else {
                call.reject("The native presentation view is unavailable", "CONFIRMATION_VIEW_UNAVAILABLE")
                return
            }
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: cancelTitle, style: .cancel) { _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    self.emitSettingsAction("settingsConfirmation", requestID: requestID, extra: ["confirmed": false])
                }
            })
            alert.addAction(UIAlertAction(title: confirmTitle, style: destructive ? .destructive : .default) { _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    self.emitSettingsAction("settingsConfirmation", requestID: requestID, extra: ["confirmed": true])
                }
            })
            presenter.present(alert, animated: false)
            call.resolve(["requestId": requestID])
        }
    }

    @objc func presentSecurePrompt(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let message = call.getString("message")
        let placeholder = call.getString("placeholder") ?? "Password"
        let value = call.getString("value") ?? ""
        let confirmTitle = call.getString("confirmTitle") ?? "Continue"
        let cancelTitle = call.getString("cancelTitle") ?? "Cancel"
        let destructive = call.getBool("destructive") ?? false
        let secure = call.getBool("secure") ?? true
        let requestID = call.getString("requestId") ?? UUID().uuidString

        DispatchQueue.main.async {
            guard let presenter = self.presentationController() else {
                call.reject("The native presentation view is unavailable", "SECURE_PROMPT_VIEW_UNAVAILABLE")
                return
            }
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addTextField { field in
                field.placeholder = placeholder
                field.text = value
                field.isSecureTextEntry = secure
                field.textContentType = secure ? .password : nil
                field.autocorrectionType = .no
                field.autocapitalizationType = .none
            }
            alert.addAction(UIAlertAction(title: cancelTitle, style: .cancel) { _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    self.emitSettingsAction("settingsSecurePrompt", requestID: requestID, extra: ["confirmed": false])
                }
            })
            alert.addAction(UIAlertAction(title: confirmTitle, style: destructive ? .destructive : .default) { [weak alert] _ in
                let value = alert?.textFields?.first?.text ?? ""
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    self.emitSettingsAction("settingsSecurePrompt", requestID: requestID, extra: ["confirmed": true, "value": value])
                }
            })
            presenter.present(alert, animated: false)
            call.resolve(["requestId": requestID])
        }
    }

    @objc func setVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        DispatchQueue.main.async {
            if #available(iOS 26.0, *) {
                self.chatRequestsVisibility = visible
                self.model.isVisible = visible && self.activeScreen == "chat"
                if !visible {
                    self.model.lastTextEventID = 0
                    self.model.lastModeEventID = 0
                    self.model.lastMenuEventID = 0
                }
            } else {
                self.model.isVisible = false
            }
            call.resolve()
        }
    }

    @objc func setScreen(_ call: CAPPluginCall) {
        let screen = call.getString("screen") ?? "none"
        DispatchQueue.main.async {
            self.activeScreen = screen
            self.model.isVisible = screen == "chat" && self.chatRequestsVisibility
            if screen != "chat" {
                self.model.isMenuOpen = false
                self.model.lastTextEventID = 0
                self.model.lastModeEventID = 0
                self.model.lastMenuEventID = 0
                self.bridge?.viewController?.view.endEditing(true)
            }
            if screen != "images" {
                self.model.isStudioComposerVisible = false
            }
            call.resolve()
        }
    }

    @objc func setAuthBackVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let owner = call.getString("owner") ?? ""
        let isDark = call.getBool("isDark") ?? true
        let isRTL = call.getBool("isRTL") ?? false

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isAuthBackVisible = false
                call.resolve()
                return
            }

            if visible {
                self.authBackOwner = owner
                self.model.isDark = isDark
                self.model.isRTL = isRTL
                self.model.isAuthBackVisible = true
            } else if self.authBackOwner == owner {
                self.authBackOwner = nil
                self.model.isAuthBackVisible = false
            }
            call.resolve()
        }
    }

    @objc func setSettingsCloseVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isSettingsCloseVisible = false
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.isSettingsCloseVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setSettingsPresentation(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true
        let offsetY = call.getDouble("offsetY") ?? 0

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isSettingsCloseVisible = false
                self.model.settingsPresentationOffsetY = 0
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.settingsPresentationOffsetY = CGFloat(max(0, offsetY))
            self.model.isSettingsCloseVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setSettingsBackVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isSettingsBackVisible = false
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.isSettingsBackVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setRemindersHeaderVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isRemindersHeaderVisible = false
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.isRemindersHeaderVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setReminderFormCloseVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isReminderFormCloseVisible = false
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.isReminderFormCloseVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setScheduleHeaderVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let isDark = call.getBool("isDark") ?? true
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                self.model.isScheduleHeaderVisible = false
                call.resolve(["visible": false])
                return
            }
            self.model.isDark = isDark
            self.model.isScheduleHeaderVisible = visible
            call.resolve(["visible": visible])
        }
    }

    @objc func setNativeActionControls(_ call: CAPPluginCall) {
        let isDark = call.getBool("isDark") ?? true
        let controls = (call.getArray("controls", JSObject.self) ?? []).compactMap { item -> BlueMindNativeActionControl? in
            guard let id = item["id"] as? String, let symbol = item["symbol"] as? String else { return nil }
            return BlueMindNativeActionControl(
                id: id,
                symbol: symbol,
                label: item["label"] as? String ?? "Action",
                x: CGFloat((item["x"] as? NSNumber)?.doubleValue ?? 0),
                y: CGFloat((item["y"] as? NSNumber)?.doubleValue ?? 0),
                width: CGFloat((item["width"] as? NSNumber)?.doubleValue ?? 44),
                height: CGFloat((item["height"] as? NSNumber)?.doubleValue ?? 44)
            )
        }
        DispatchQueue.main.async {
            self.model.isDark = isDark
            self.model.nativeActionControls = controls
            call.resolve(["count": controls.count])
        }
    }

    @objc func presentAllSchedules(_ call: CAPPluginCall) {
        let requestID = call.getString("requestId") ?? UUID().uuidString
        let isDark = call.getBool("isDark") ?? true
        let schedules = (call.getArray("schedules", JSObject.self) ?? []).compactMap { item -> BlueMindNativeScheduleItem? in
            guard let id = item["id"] as? String, let title = item["title"] as? String else { return nil }
            return BlueMindNativeScheduleItem(
                id: id,
                title: title,
                detail: item["detail"] as? String ?? "",
                symbol: item["symbol"] as? String ?? "calendar"
            )
        }
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *), let presenter = self.presentationController() else {
                call.reject("Native All Schedules requires iOS 26", "ALL_SCHEDULES_UNAVAILABLE")
                return
            }
            let root = BlueMindAllSchedulesSheet(items: schedules, isDark: isDark) { [weak self] action, id in
                guard let self else { return }
                if action == "close" {
                    presenter.dismiss(animated: true)
                } else {
                    self.emitSettingsAction("scheduleSheetAction", requestID: requestID, extra: ["value": action, "scheduleId": id])
                    presenter.dismiss(animated: true)
                }
            }
            let host = UIHostingController(rootView: root)
            host.modalPresentationStyle = .pageSheet
            if let sheet = host.sheetPresentationController {
                let identifier = UISheetPresentationController.Detent.Identifier("blueMindNinetyPercent")
                sheet.detents = [.custom(identifier: identifier) { context in context.maximumDetentValue * 0.90 }]
                sheet.selectedDetentIdentifier = identifier
                sheet.prefersGrabberVisible = false
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.preferredCornerRadius = 34
                sheet.largestUndimmedDetentIdentifier = nil
            }
            presenter.present(host, animated: true)
            call.resolve(["requestId": requestID])
        }
    }

    @objc func presentChatEntrySheet(_ call: CAPPluginCall) {
        let requestID = call.getString("requestId") ?? UUID().uuidString
        let kind = call.getString("kind") ?? "hidden"
        let isDark = call.getBool("isDark") ?? true
        let chats = (call.getArray("privateChats", JSObject.self) ?? []).compactMap { item -> BlueMindNativePrivateChatItem? in
            guard let id = item["id"] as? String, let name = item["name"] as? String else { return nil }
            return BlueMindNativePrivateChatItem(id: id, name: name)
        }

        DispatchQueue.main.async {
            guard #available(iOS 26.0, *), let presenter = self.presentationController() else {
                call.reject("Native chat entry sheets require iOS 26", "CHAT_ENTRY_SHEET_UNAVAILABLE")
                return
            }
            let sheetKind: BlueMindChatEntrySheet.Kind = kind == "private" ? .privateChats : .hidden
            weak var host: UIHostingController<BlueMindChatEntrySheet>?
            var dismissDelegate: BlueMindChatSheetDismissDelegate?
            let root = BlueMindChatEntrySheet(kind: sheetKind, privateChats: chats, isDark: isDark) { [weak self] value, id in
                guard let self else { return }
                dismissDelegate?.markHandled()
                host?.dismiss(animated: true) {
                    self.emitSettingsAction("chatEntrySheetAction", requestID: requestID, extra: ["value": value, "privateSpaceId": id])
                }
            }
            let controller = UIHostingController(rootView: root)
            host = controller
            controller.view.backgroundColor = .clear
            controller.modalPresentationStyle = .pageSheet
            let delegate = BlueMindChatSheetDismissDelegate { [weak self] in
                self?.emitSettingsAction("chatEntrySheetAction", requestID: requestID, extra: ["value": "close", "privateSpaceId": ""])
            }
            dismissDelegate = delegate
            self.chatSheetDismissDelegate = delegate
            controller.presentationController?.delegate = delegate
            if let sheet = controller.sheetPresentationController {
                let identifier = UISheetPresentationController.Detent.Identifier("blueMindChatEntry")
                let requestedHeight: CGFloat = sheetKind == .hidden
                    ? 282
                    : min(570, chats.isEmpty ? 350 : 286 + CGFloat(min(chats.count, 4)) * 53)
                sheet.detents = [.custom(identifier: identifier) { context in min(requestedHeight, context.maximumDetentValue * 0.72) }]
                sheet.selectedDetentIdentifier = identifier
                sheet.prefersGrabberVisible = true
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.preferredCornerRadius = 30
                sheet.largestUndimmedDetentIdentifier = nil
            }
            presenter.present(controller, animated: true)
            call.resolve(["requestId": requestID])
        }
    }

    @objc func updateState(_ call: CAPPluginCall) {
        let modes = (call.getArray("modes", JSObject.self) ?? []).compactMap { item -> BlueMindGlassMode? in
            guard let id = item["id"] as? String, let title = item["title"] as? String else { return nil }
            return BlueMindGlassMode(id: id, title: title)
        }
        let models = (call.getArray("models", JSObject.self) ?? []).compactMap { item -> BlueMindGlassModelOption? in
            guard let id = item["id"] as? String, let title = item["title"] as? String else { return nil }
            return BlueMindGlassModelOption(id: id, title: title, badge: item["badge"] as? String ?? "")
        }
        let attachmentPayload = call.getArray("attachments", JSObject.self) ?? []

        DispatchQueue.main.async {
            let acknowledgedEventID = UInt64(call.getString("ackEventId") ?? "") ?? 0
            let nextText = call.getString("text") ?? ""
            if acknowledgedEventID >= self.model.lastTextEventID, self.model.text != nextText {
                self.model.text = nextText
            }
            self.model.canSend = call.getBool("canSend") ?? false
            self.model.isSending = call.getBool("isSending") ?? false
            self.model.isListening = call.getBool("isListening") ?? false
            self.model.voiceStatus = call.getString("voiceStatus") ?? "idle"
            if !self.model.isListening && self.model.voiceStatus == "idle" {
                self.model.audioLevels = []
            }
            self.model.voiceTranscript = call.getString("voiceTranscript") ?? ""
            let attachmentSignature = attachmentPayload.map {
                "\($0["id"] as? String ?? ""):\(($0["previewData"] as? String ?? "").count):\(($0["originalData"] as? String ?? "").count):\($0["assetIdentifier"] as? String ?? ""):\($0["uploadState"] as? String ?? "uploaded")"
            }.joined(separator: "|")
            if self.model.attachmentSignature != attachmentSignature {
                self.model.attachmentSignature = attachmentSignature
                self.model.attachments = attachmentPayload.compactMap { item -> BlueMindGlassAttachment? in
                    guard let id = item["id"] as? String else { return nil }
                    let name = item["name"] as? String ?? "Image"
                    let previewData = item["previewData"] as? String ?? ""
                    let encoded = previewData.split(separator: ",", maxSplits: 1).last.map(String.init) ?? previewData
                    let image = Data(base64Encoded: encoded).flatMap(UIImage.init(data:))
                    return BlueMindGlassAttachment(
                        id: id,
                        name: name,
                        type: item["type"] as? String ?? "image",
                        size: (item["size"] as? NSNumber)?.int64Value ?? 0,
                        image: image,
                        originalData: item["originalData"] as? String ?? "",
                        assetIdentifier: item["assetIdentifier"] as? String ?? "",
                        uploadState: item["uploadState"] as? String ?? "uploaded"
                    )
                }
            }
            self.model.isUploadingAttachments = call.getBool("isUploadingAttachments") ?? false
            self.model.isComposerVisible = call.getBool("isComposerVisible") ?? true
            self.model.isHeaderVisible = call.getBool("isHeaderVisible") ?? true
            if acknowledgedEventID >= self.model.lastMenuEventID {
                self.model.isMenuOpen = call.getBool("isMenuOpen") ?? false
            }
            self.model.isDark = call.getBool("isDark") ?? true
            self.model.isRTL = call.getBool("isRTL") ?? false
            self.model.accentColor = Color(hex: call.getString("accentColor") ?? "#193B68")
            if let brandPrimaryColor = call.getString("brandPrimaryColor") {
                self.model.brandPrimaryColor = Color(hex: brandPrimaryColor)
            }
            self.model.isWritingMode = call.getBool("isWritingMode") ?? false
            self.model.isAIPlanMode = call.getBool("isAIPlanMode") ?? false
            self.model.chatSessionMode = call.getString("chatSessionMode") ?? "normal"
            self.model.modeStatusTitle = call.getString("modeStatusTitle") ?? ""
            self.model.modeExitTitle = call.getString("modeExitTitle") ?? ""
            self.model.composerPlaceholder = call.getString("placeholder") ?? "Ask anything…"
            self.model.headerTitlePrefix = call.getString("headerTitlePrefix") ?? ""
            self.model.quickActions = call.getArray("quickActions", String.self) ?? []
            if !modes.isEmpty { self.model.modes = modes }
            if !models.isEmpty { self.model.models = models }
            if acknowledgedEventID >= self.model.lastModeEventID {
                self.model.selectedMode = call.getString("selectedMode") ?? "general"
                self.model.selectedModel = call.getString("selectedModel") ?? "bluemind-5-0"
                self.model.thinkingEnabled = call.getBool("thinkingEnabled") ?? false
            }
            call.resolve()
        }
    }

    @objc func updateAudioLevels(_ call: CAPPluginCall) {
        let levels = (call.getArray("levels", Double.self) ?? []).map { max(0.08, min(1, $0)) }
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: 0.16)) {
                self.model.audioLevels = levels
                self.model.audioVisualizationFrame &+= 1
            }
            call.resolve()
        }
    }

    @MainActor
    func emit(_ action: String, text: String? = nil, mode: String? = nil, attachmentID: String? = nil, conversationID: String? = nil) {
        let isAuthBackAction = action == "authBack" && model.isAuthBackVisible
        let isSettingsCloseAction = action == "settingsClose" && model.isSettingsCloseVisible
        let isSettingsBackAction = action == "settingsBack" && model.isSettingsBackVisible
        let isRemindersAction = ["remindersBack", "remindersAdd"].contains(action) && model.isRemindersHeaderVisible
        let isReminderFormAction = action == "reminderFormClose" && model.isReminderFormCloseVisible
        let isScheduleAction = ["scheduleBack", "scheduleAdd"].contains(action) && model.isScheduleHeaderVisible
        let isNativeControlAction = action == "nativeControl" && model.nativeActionControls.contains(where: { $0.id == text })
        let isStudioAction = activeScreen == "images" && model.isStudioComposerVisible && ["studioTextChanged", "studioCustomize", "studioGenerate"].contains(action)
        guard isAuthBackAction || isSettingsCloseAction || isSettingsBackAction || isRemindersAction || isReminderFormAction || isScheduleAction || isNativeControlAction || isStudioAction || (activeScreen == "chat" && model.isVisible) else { return }
        nextEventID &+= 1
        if action == "menu" {
            model.lastMenuEventID = nextEventID
            bridge?.viewController?.view.endEditing(true)
            withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.32)) {
                if model.isDark {
                    model.isMenuOpen.toggle()
                } else {
                    model.isMenuOpen = true
                }
            }
        } else if action == "menuClose" {
            model.lastMenuEventID = nextEventID
            model.isMenuOpen = false
        } else if action == "textChanged" || action == "studioTextChanged" {
            model.lastTextEventID = nextEventID
        } else if action == "selectMode" {
            model.lastModeEventID = nextEventID
        }
        var data = JSObject()
        data["eventId"] = String(nextEventID)
        data["action"] = action
        data["nativeBuild"] = Self.auditBuild
        if let text { data["text"] = text }
        if let mode { data["mode"] = mode }
        if let attachmentID { data["attachmentId"] = attachmentID }
        if let conversationID { data["conversationId"] = conversationID }
#if DEBUG
        print("[BlueMindNativeGlass] emit", action, nextEventID)
#endif
        notifyListeners("action", data: data)
    }
}

extension BlueMindNativeGlassPlugin: PHPickerViewControllerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate, UIDocumentPickerDelegate {
    private func attachmentPayload(data: Data, name: String, mimeType: String) -> [String: Any] {
        [
            "name": name,
            "mimeType": mimeType,
            "base64": data.base64EncodedString(),
        ]
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        let source = writingAttachmentSource
        picker.dismiss(animated: true)
        guard !results.isEmpty else { return }

        var payloads = Array<[String: Any]?>(repeating: nil, count: results.count)
        var remaining = results.count
        for (index, result) in results.enumerated() {
            let provider = result.itemProvider
            let identifier = provider.registeredTypeIdentifiers.first(where: { UTType($0)?.conforms(to: .image) == true }) ?? UTType.image.identifier
            provider.loadDataRepresentation(forTypeIdentifier: identifier) { data, _ in
                DispatchQueue.main.async {
                    if let data {
                        let type = UTType(identifier)
                        let extensionName = type?.preferredFilenameExtension ?? "jpg"
                        let name = provider.suggestedName.map { "\($0).\(extensionName)" } ?? "Photo-\(index + 1).\(extensionName)"
                        payloads[index] = self.attachmentPayload(data: data, name: name, mimeType: type?.preferredMIMEType ?? "image/jpeg")
                    }
                    remaining -= 1
                    if remaining == 0 {
                        self.emitWritingAttachments(payloads.compactMap { $0 }, source: source)
                    }
                }
            }
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let source = writingAttachmentSource
        guard let image = info[.originalImage] as? UIImage else {
            picker.dismiss(animated: true)
            return
        }

        let startedAt = CACurrentMediaTime()
        let clientID = "local-camera-\(UUID().uuidString)"
        let name = "Camera-\(Int(Date().timeIntervalSince1970)).jpg"
        picker.dismiss(animated: true)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            autoreleasepool {
                let thumbnailStartedAt = CACurrentMediaTime()
                let thumbnail = image.preparingThumbnail(of: CGSize(width: 360, height: 360)) ?? image
                guard let previewData = thumbnail.jpegData(compressionQuality: 0.78) else { return }
                let previewReadyAt = CACurrentMediaTime()

                Task { @MainActor [weak self] in
                    self?.emitNativeAttachmentPreviews([[
                        "id": clientID,
                        "name": name,
                        "mimeType": "image/jpeg",
                        "previewBase64": previewData.base64EncodedString(),
                        "assetIdentifier": "",
                        "uploadState": "uploading",
                    ]], source: source)
#if DEBUG
                    print("[BlueMindCameraTiming] capture-to-preview-ms=\(Int((previewReadyAt - startedAt) * 1000)) thumbnail-ms=\(Int((previewReadyAt - thumbnailStartedAt) * 1000)) preview-bytes=\(previewData.count)")
#endif
                }

                let originalStartedAt = CACurrentMediaTime()
                guard let originalData = image.jpegData(compressionQuality: 1.0) else { return }
                let originalReadyAt = CACurrentMediaTime()
                var payload = self?.attachmentPayload(data: originalData, name: name, mimeType: "image/jpeg") ?? [:]
                payload["clientId"] = clientID

                Task { @MainActor [weak self] in
                    self?.emitWritingAttachments([payload], source: source)
#if DEBUG
                    let width = image.cgImage?.width ?? Int(image.size.width * image.scale)
                    let height = image.cgImage?.height ?? Int(image.size.height * image.scale)
                    print("[BlueMindCameraTiming] original-ready-ms=\(Int((originalReadyAt - startedAt) * 1000)) original-encode-ms=\(Int((originalReadyAt - originalStartedAt) * 1000)) pixels=\(width)x\(height) original-bytes=\(originalData.count)")
#endif
                }
            }
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        controller.dismiss(animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        let source = writingAttachmentSource
        let payloads = urls.compactMap { url -> [String: Any]? in
            let secured = url.startAccessingSecurityScopedResource()
            defer { if secured { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url, options: .mappedIfSafe) else { return nil }
            let values = try? url.resourceValues(forKeys: [.contentTypeKey])
            return attachmentPayload(
                data: data,
                name: url.lastPathComponent,
                mimeType: values?.contentType?.preferredMIMEType ?? "application/octet-stream"
            )
        }
        controller.dismiss(animated: true) {
            Task { @MainActor in self.emitWritingAttachments(payloads, source: source) }
        }
    }
}

@available(iOS 16.0, *)
private final class BlueMindConversationContextMenu: NSObject, UIContextMenuInteractionDelegate, WKScriptMessageHandler {
    private static let messageName = "blueMindConversationContextCandidate"
    private weak var webView: WKWebView?
    private let emit: (String, String, String?) -> Void
    private var candidateConversationID = ""
    private var candidateConversationTitle = ""
    private var candidateRect = CGRect.zero

    init(webView: WKWebView, emit: @escaping (String, String, String?) -> Void) {
        self.webView = webView
        self.emit = emit
        super.init()

        let interaction = UIContextMenuInteraction(delegate: self)
        webView.addInteraction(interaction)
        let script = """
        (() => {
          if (window.__blueMindConversationContextProbeInstalled) return;
          window.__blueMindConversationContextProbeInstalled = true;
          document.addEventListener('pointerdown', (event) => {
            const row = event.target?.closest?.('[data-native-conversation-id]');
            if (!row) {
              window.webkit.messageHandlers.\(Self.messageName).postMessage(null);
              return;
            }
            const rect = row.getBoundingClientRect();
            window.webkit.messageHandlers.\(Self.messageName).postMessage({
              id: row.dataset.nativeConversationId || '',
              title: row.dataset.nativeConversationTitle || '',
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            });
          }, { capture: true, passive: true });
        })()
        """
        webView.configuration.userContentController.add(self, name: Self.messageName)
        webView.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        webView.evaluateJavaScript(script)
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: Self.messageName)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageName, let payload = message.body as? [String: Any], let id = payload["id"] as? String, !id.isEmpty else {
            candidateConversationID = ""
            candidateConversationTitle = ""
            candidateRect = .zero
            return
        }
        candidateConversationID = id
        candidateConversationTitle = payload["title"] as? String ?? ""
        candidateRect = CGRect(
            x: (payload["x"] as? NSNumber)?.doubleValue ?? 0,
            y: (payload["y"] as? NSNumber)?.doubleValue ?? 0,
            width: (payload["width"] as? NSNumber)?.doubleValue ?? 0,
            height: (payload["height"] as? NSNumber)?.doubleValue ?? 0
        )
#if DEBUG
        print("[BlueMindNativeGlass] context candidate", id, candidateRect)
#endif
    }

    func contextMenuInteraction(_ interaction: UIContextMenuInteraction, configurationForMenuAtLocation location: CGPoint) -> UIContextMenuConfiguration? {
        guard !candidateConversationID.isEmpty, candidateRect.insetBy(dx: -8, dy: -8).contains(location) else { return nil }
        let id = candidateConversationID
        let title = candidateConversationTitle
#if DEBUG
        print("[BlueMindNativeGlass] presenting context menu", id)
#endif
        return UIContextMenuConfiguration(identifier: id as NSString, previewProvider: nil) { [weak self] _ in
            UIMenu(children: [
                UIAction(title: "Rename", image: UIImage(systemName: "pencil")) { _ in self?.presentRenamePrompt(id: id, title: title) },
                UIAction(title: "Move to Project", image: UIImage(systemName: "folder.badge.plus")) { _ in self?.emit("conversationAddToProject", id, nil) },
                UIAction(title: "Delete", image: UIImage(systemName: "trash"), attributes: .destructive) { _ in self?.presentDeleteConfirmation(id: id, title: title) },
            ])
        }
    }

    func contextMenuInteraction(_ interaction: UIContextMenuInteraction, previewForHighlightingMenuWithConfiguration configuration: UIContextMenuConfiguration) -> UITargetedPreview? {
        makeRowPreview()
    }

    func contextMenuInteraction(_ interaction: UIContextMenuInteraction, previewForDismissingMenuWithConfiguration configuration: UIContextMenuConfiguration) -> UITargetedPreview? {
        makeRowPreview()
    }

    private func makeRowPreview() -> UITargetedPreview? {
        guard let webView, !candidateRect.isEmpty else { return nil }
        let rect = candidateRect.intersection(webView.bounds)
        guard !rect.isEmpty else { return nil }
        let parameters = UIPreviewParameters()
        parameters.backgroundColor = .clear
        parameters.visiblePath = UIBezierPath(roundedRect: rect, cornerRadius: 14)
        parameters.shadowPath = UIBezierPath()
        return UITargetedPreview(view: webView, parameters: parameters)
    }

    private func presentRenamePrompt(id: String, title: String) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { [weak self] in
            guard let self, let presenter = self.presenter else { return }
            let alert = UIAlertController(title: "Rename Chat", message: nil, preferredStyle: .alert)
            alert.addTextField { field in
                field.text = title
                field.placeholder = "Chat title"
                field.clearButtonMode = .whileEditing
                field.returnKeyType = .done
            }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            alert.addAction(UIAlertAction(title: "Rename", style: .default) { [weak self, weak alert] _ in
                let nextTitle = alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                guard !nextTitle.isEmpty else { return }
                self?.emit("conversationRenameConfirmed", id, String(nextTitle.prefix(120)))
            })
            presenter.present(alert, animated: true)
        }
    }

    private func presentDeleteConfirmation(id: String, title: String) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { [weak self] in
            guard let self, let presenter = self.presenter else { return }
            let displayTitle = title.isEmpty ? "this chat" : "\"\(title)\""
            let alert = UIAlertController(title: "Delete Chat?", message: "This removes \(displayTitle) from your chat history.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
                self?.emit("conversationDeleteConfirmed", id, nil)
            })
            presenter.present(alert, animated: true)
        }
    }

    private var presenter: UIViewController? {
        var controller = webView?.window?.rootViewController
        while let presented = controller?.presentedViewController {
            controller = presented
        }
        return controller
    }
}

@available(iOS 26.0, *)
@MainActor
private final class BlueMindDrawerGestureCoordinator: NSObject, UIGestureRecognizerDelegate {
    private weak var view: UIView?
    private let model: BlueMindGlassModel
    private let emit: (String) -> Void
    private let excludesOutsideTap: (CGPoint) -> Bool

    init(view: UIView, model: BlueMindGlassModel, excludesOutsideTap: @escaping (CGPoint) -> Bool, emit: @escaping (String) -> Void) {
        self.view = view
        self.model = model
        self.excludesOutsideTap = excludesOutsideTap
        self.emit = emit
        super.init()

        let outsideTap = UITapGestureRecognizer(target: self, action: #selector(handleOutsideTap(_:)))
        outsideTap.cancelsTouchesInView = false
        outsideTap.delegate = self
        view.addGestureRecognizer(outsideTap)

        let closePan = UIPanGestureRecognizer(target: self, action: #selector(handleClosePan(_:)))
        closePan.cancelsTouchesInView = false
        closePan.maximumNumberOfTouches = 1
        closePan.delegate = self
        view.addGestureRecognizer(closePan)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        true
    }

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard model.isVisible, model.isDark, model.isMenuOpen, let view else { return false }
        let point = gestureRecognizer.location(in: view)
        let menuWidth = view.bounds.width * 0.84

        if let pan = gestureRecognizer as? UIPanGestureRecognizer {
            let velocity = pan.velocity(in: view)
            let beginsInsideMenu = model.isRTL ? point.x >= view.bounds.width - menuWidth : point.x <= menuWidth
            let movesTowardClosed = model.isRTL ? velocity.x > 0 : velocity.x < 0
            return beginsInsideMenu && movesTowardClosed && abs(velocity.x) > abs(velocity.y)
        }

        let isOutside = model.isRTL ? point.x < view.bounds.width - menuWidth : point.x > menuWidth
        return isOutside && !excludesOutsideTap(point)
    }

    @objc private func handleOutsideTap(_ recognizer: UITapGestureRecognizer) {
        guard recognizer.state == .ended else { return }
#if DEBUG
        print("[BlueMindNativeGlass] outside tap -> close menu")
#endif
        emit("menuClose")
    }

    @objc private func handleClosePan(_ recognizer: UIPanGestureRecognizer) {
        guard recognizer.state == .ended || recognizer.state == .cancelled else { return }
        guard let view else { return }
        let translation = recognizer.translation(in: view)
        let velocity = recognizer.velocity(in: view)
        let distance = model.isRTL ? translation.x : -translation.x
        let speed = model.isRTL ? velocity.x : -velocity.x
        guard distance > 42 || speed > 360 else { return }
#if DEBUG
        print("[BlueMindNativeGlass] close swipe -> close menu", distance, speed)
#endif
        emit("menuClose")
    }
}

@available(iOS 26.0, *)
private struct BlueMindGlassHitRegion: Equatable {
    enum Kind: Equatable {
        case authBack
        case settingsClose
        case settingsBack
        case remindersBack
        case remindersAdd
        case reminderFormClose
        case scheduleBack
        case scheduleAdd
        case nativeControl(String)
        case studioComposer
        case menuButton
        case header
        case composer
    }

    let frame: CGRect
    let kind: Kind
}

@available(iOS 26.0, *)
private struct BlueMindGlassHitRegionPreferenceKey: PreferenceKey {
    static var defaultValue: [BlueMindGlassHitRegion] = []

    static func reduce(value: inout [BlueMindGlassHitRegion], nextValue: () -> [BlueMindGlassHitRegion]) {
        value.append(contentsOf: nextValue())
    }
}

@available(iOS 26.0, *)
private extension View {
    func blueMindGlassHitRegion(_ kind: BlueMindGlassHitRegion.Kind) -> some View {
        background {
            GeometryReader { proxy in
                Color.clear.preference(
                    key: BlueMindGlassHitRegionPreferenceKey.self,
                    value: [BlueMindGlassHitRegion(
                        frame: proxy.frame(in: .named("BlueMindNativeGlassOverlay")),
                        kind: kind
                    )]
                )
            }
        }
    }
}

@available(iOS 26.0, *)
private struct BlueMindComposerTextView: UIViewRepresentable {
    @Binding var text: String
    @Binding var height: CGFloat
    let isRTL: Bool
    let automaticMaximumHeight: CGFloat
    let isManuallySized: Bool
    let onChange: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.delegate = context.coordinator
        view.backgroundColor = .clear
        view.font = .preferredFont(forTextStyle: .body)
        view.adjustsFontForContentSizeCategory = true
        view.isScrollEnabled = false
        view.textContainerInset = UIEdgeInsets(top: 3, left: 0, bottom: 3, right: 0)
        view.textContainer.lineFragmentPadding = 0
        view.autocorrectionType = .yes
        view.spellCheckingType = .yes
        view.keyboardDismissMode = .interactive
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        context.coordinator.parent = self
        if view.text != text { view.text = text }
        view.textAlignment = isRTL ? .right : .natural
        recalculateHeight(view)
    }

    private func recalculateHeight(_ view: UITextView) {
        guard view.bounds.width > 0 else { return }
        let fitting = view.sizeThatFits(CGSize(width: view.bounds.width, height: .greatestFiniteMagnitude)).height
        if isManuallySized {
            view.isScrollEnabled = fitting > height + 0.5
            return
        }
        let nextHeight = min(automaticMaximumHeight, max(28, ceil(fitting)))
        view.isScrollEnabled = fitting > automaticMaximumHeight
        guard abs(height - nextHeight) > 0.5 else { return }
        DispatchQueue.main.async {
            withAnimation(.smooth(duration: 0.28)) { height = nextHeight }
        }
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: BlueMindComposerTextView

        init(_ parent: BlueMindComposerTextView) { self.parent = parent }

        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text
            parent.onChange(textView.text)
            parent.recalculateHeight(textView)
        }
    }
}

@available(iOS 26.0, *)
private struct BlueMindComposerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.88 : 1)
            .opacity(configuration.isPressed ? 0.7 : 1)
            .animation(.smooth(duration: 0.2), value: configuration.isPressed)
    }
}

@available(iOS 26.0, *)
private struct BlueMindStudioComposer: View {
    @ObservedObject var model: BlueMindGlassModel
    let action: (String, String?) -> Void
    @State private var textHeight: CGFloat = 28

    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .topLeading) {
                if model.studioText.isEmpty {
                    Text(model.studioPlaceholder)
                        .foregroundStyle(.secondary)
                        .padding(.top, 5)
                        .allowsHitTesting(false)
                }
                BlueMindComposerTextView(
                    text: $model.studioText,
                    height: $textHeight,
                    isRTL: false,
                    automaticMaximumHeight: 144,
                    isManuallySized: false
                ) { value in action("studioTextChanged", value) }
                .frame(height: textHeight)
            }
            .frame(maxWidth: .infinity)

            HStack(spacing: 10) {
                Button { action("studioCustomize", nil) } label: {
                    Label("Customize", systemImage: "slider.horizontal.3")
                        .font(.system(size: 13, weight: .semibold))
                        .padding(.horizontal, 13)
                        .frame(height: 36)
                        .glassEffect(.regular.interactive(), in: Capsule())
                }
                .buttonStyle(BlueMindComposerButtonStyle())
                .accessibilityLabel("Customize")

                Spacer(minLength: 8)

                Button { action("studioGenerate", model.studioText) } label: {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(model.studioCanGenerate ? .white : .secondary)
                        .frame(width: 36, height: 36)
                        .background(model.studioCanGenerate ? model.studioPrimaryColor : Color.secondary.opacity(0.12), in: Circle())
                }
                .buttonStyle(BlueMindComposerButtonStyle())
                .disabled(!model.studioCanGenerate)
                .accessibilityLabel("Generate")
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 28))
        .animation(.smooth(duration: 0.28), value: textHeight)
        .blueMindGlassHitRegion(.studioComposer)
    }
}

@available(iOS 26.0, *)
private struct BlueMindHeaderButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .opacity(configuration.isPressed ? 0.86 : 1)
            .animation(.smooth(duration: 0.22), value: configuration.isPressed)
    }
}

@available(iOS 26.0, *)
@MainActor
private final class BlueMindFullResolutionAttachmentLoader: ObservableObject {
    @Published var image: UIImage?
    @Published private(set) var isLoadingOriginal = false
    @Published private(set) var loadFailed = false
    private var loadedRevision = ""
    private var timeoutTask: Task<Void, Never>?

    deinit { timeoutTask?.cancel() }

    func load(_ attachment: BlueMindGlassAttachment) {
        let revision = "\(attachment.assetIdentifier)|\(attachment.originalData.count)"
        guard loadedRevision != revision else { return }
        loadedRevision = revision
        if image == nil { image = attachment.image }
        isLoadingOriginal = true
        loadFailed = false
        beginTimeout(for: revision, name: attachment.name)
#if DEBUG
        print("[BlueMindImagePreview] preview-opened id=\(attachment.id)")
        if let preview = attachment.image {
            Self.logImage(preview, source: "composer-thumbnail-derived", name: attachment.name)
            print("[BlueMindImagePreview] state=preview-visible id=\(attachment.id)")
        }
        print("[BlueMindImagePreview] attachment name=\(attachment.name) asset-id=\(!attachment.assetIdentifier.isEmpty) original-base64-characters=\(attachment.originalData.count) state=\(attachment.uploadState)")
#endif

        // Optimistic attachments initially contain only the small UI preview. Wait for
        // the original source to arrive rather than promoting that preview fullscreen.
        guard !attachment.assetIdentifier.isEmpty || !attachment.originalData.isEmpty else {
#if DEBUG
            print("[BlueMindImagePreview] state=awaiting-original id=\(attachment.id)")
#endif
            return
        }

        if !attachment.assetIdentifier.isEmpty {
#if DEBUG
            print("[BlueMindImagePreview] original-requested source=PHAsset id=\(attachment.id)")
#endif
            let assets = PHAsset.fetchAssets(withLocalIdentifiers: [attachment.assetIdentifier], options: nil)
            if let asset = assets.firstObject {
                let options = PHImageRequestOptions()
                options.deliveryMode = .highQualityFormat
                options.version = .current
                options.isNetworkAccessAllowed = true
                PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { [weak self] data, dataUTI, _, info in
                    guard let data else {
#if DEBUG
                        print("[BlueMindImagePreview] Photos original unavailable", attachment.name, info ?? [:])
#endif
                        self?.loadOriginalDataFallback(attachment, revision: revision)
                        return
                    }
#if DEBUG
                    print("[BlueMindImagePreview] original-received source=PHAsset id=\(attachment.id) bytes=\(data.count)")
                    print("[BlueMindImagePreview] decode-started id=\(attachment.id)")
#endif
                    DispatchQueue.global(qos: .userInitiated).async {
                        let decoded = UIImage(data: data)
                        DispatchQueue.main.async {
                            guard self?.loadedRevision == revision else { return }
                            if let decoded {
#if DEBUG
                                Self.logImage(decoded, source: "PHAsset-current-original", name: attachment.name, byteCount: data.count, expectedPixels: (asset.pixelWidth, asset.pixelHeight), format: dataUTI ?? "unknown")
                                print("[BlueMindImagePreview] decode-succeeded id=\(attachment.id) state=loaded")
#endif
                                self?.finish(with: decoded, revision: revision)
                            }
                            else { self?.loadOriginalDataFallback(attachment, revision: revision) }
                        }
                    }
                }
                return
            }
        }

        loadOriginalDataFallback(attachment, revision: revision)
    }

    private func loadOriginalDataFallback(_ attachment: BlueMindGlassAttachment, revision: String) {
        let source = attachment.originalData
        guard !source.isEmpty else { return }
#if DEBUG
        print("[BlueMindImagePreview] original-requested source=attachment-data id=\(attachment.id)")
#endif
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let encoded = source.split(separator: ",", maxSplits: 1).last.map(String.init) ?? source
            let data = Data(base64Encoded: encoded)
#if DEBUG
            print("[BlueMindImagePreview] original-received source=attachment-data id=\(attachment.id) bytes=\(data?.count ?? 0)")
            print("[BlueMindImagePreview] decode-started id=\(attachment.id)")
#endif
            let decoded = data.flatMap(UIImage.init(data:))
            DispatchQueue.main.async {
                guard self?.loadedRevision == revision else { return }
                if let decoded {
#if DEBUG
                    let declaredFormat = source.hasPrefix("data:")
                        ? String(source.prefix(upTo: source.firstIndex(of: ";") ?? source.endIndex))
                        : "encoded-original"
                    Self.logImage(decoded, source: "attachment-original-data", name: attachment.name, byteCount: data?.count, format: declaredFormat)
                    print("[BlueMindImagePreview] decode-succeeded id=\(attachment.id) state=loaded")
#endif
                    self?.finish(with: decoded, revision: revision)
                } else {
#if DEBUG
                    print("[BlueMindImagePreview] original decode failed name=\(attachment.name) bytes=\(data?.count ?? 0)")
#endif
                    self?.finishFailure(revision: revision, reason: "decode-failed", name: attachment.name)
                }
            }
        }
    }

    private func beginTimeout(for revision: String, name: String) {
        timeoutTask?.cancel()
        timeoutTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 8_000_000_000)
            guard !Task.isCancelled else { return }
            self?.finishFailure(revision: revision, reason: "original-source-timeout", name: name)
        }
    }

    private func finish(with image: UIImage, revision: String) {
        guard loadedRevision == revision else { return }
        timeoutTask?.cancel()
        timeoutTask = nil
        self.image = image
        isLoadingOriginal = false
        loadFailed = false
    }

    private func finishFailure(revision: String, reason: String, name: String) {
        guard loadedRevision == revision, isLoadingOriginal else { return }
        timeoutTask?.cancel()
        timeoutTask = nil
        isLoadingOriginal = false
        loadFailed = true
#if DEBUG
        print("[BlueMindImagePreview] state=error reason=\(reason) name=\(name) preview-retained=\(image != nil)")
#endif
    }

#if DEBUG
    private static func logImage(
        _ image: UIImage,
        source: String,
        name: String,
        byteCount: Int? = nil,
        expectedPixels: (Int, Int)? = nil,
        format: String = "unknown"
    ) {
        let width = image.cgImage?.width ?? Int(image.size.width * image.scale)
        let height = image.cgImage?.height ?? Int(image.size.height * image.scale)
        let bytes = byteCount.map { " bytes=\($0)" } ?? ""
        let expected = expectedPixels.map { " asset=\($0.0)x\($0.1)" } ?? ""
        print("[BlueMindImagePreview] source=\(source) name=\(name) format=\(format) pixels=\(width)x\(height)\(expected)\(bytes)")
    }
#endif
}

@available(iOS 26.0, *)
private struct BlueMindFullResolutionAttachmentPage: View {
    let attachment: BlueMindGlassAttachment
    @StateObject private var loader = BlueMindFullResolutionAttachmentLoader()

    init(attachment: BlueMindGlassAttachment) {
        self.attachment = attachment
    }

    var body: some View {
        ZStack {
            Color.black
            if let image = loader.image {
                BlueMindZoomableAttachmentImage(image: image)
            } else if loader.isLoadingOriginal {
                ProgressView().tint(.white)
            }

            if loader.isLoadingOriginal, loader.image != nil {
                ProgressView()
                    .tint(.white)
                    .padding(10)
                    .background(.ultraThinMaterial, in: Circle())
                    .allowsHitTesting(false)
            }
        }
        .onAppear { loader.load(attachment) }
        .onChange(of: attachment.assetIdentifier) { _ in loader.load(attachment) }
        .onChange(of: attachment.originalData.count) { _ in loader.load(attachment) }
    }
}

@available(iOS 26.0, *)
private struct BlueMindZoomableAttachmentImage: UIViewRepresentable {
    let image: UIImage

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> UIScrollView {
        let scrollView = UIScrollView()
        scrollView.delegate = context.coordinator
        scrollView.backgroundColor = .black
        scrollView.minimumZoomScale = 1
        scrollView.maximumZoomScale = 5
        scrollView.bouncesZoom = true
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.panGestureRecognizer.isEnabled = false

        let imageView = UIImageView(image: image)
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.isUserInteractionEnabled = true
        scrollView.addSubview(imageView)
        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            imageView.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            imageView.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            imageView.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
            imageView.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor),
        ])
        context.coordinator.imageView = imageView
        context.coordinator.scrollView = scrollView

        let doubleTap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleDoubleTap(_:)))
        doubleTap.numberOfTapsRequired = 2
        scrollView.addGestureRecognizer(doubleTap)
        return scrollView
    }

    func updateUIView(_ scrollView: UIScrollView, context: Context) {
        if context.coordinator.imageView?.image !== image {
            context.coordinator.imageView?.image = image
            scrollView.setZoomScale(1, animated: false)
            scrollView.contentOffset = .zero
        }
    }

    final class Coordinator: NSObject, UIScrollViewDelegate {
        weak var imageView: UIImageView?
        weak var scrollView: UIScrollView?

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            scrollView.panGestureRecognizer.isEnabled = scrollView.zoomScale > scrollView.minimumZoomScale + 0.01
        }

        @objc func handleDoubleTap(_ gesture: UITapGestureRecognizer) {
            guard let scrollView else { return }
            if scrollView.zoomScale > scrollView.minimumZoomScale + 0.01 {
                scrollView.setZoomScale(scrollView.minimumZoomScale, animated: true)
                return
            }
            let targetScale = min(2.5, scrollView.maximumZoomScale)
            let point = gesture.location(in: imageView)
            let width = scrollView.bounds.width / targetScale
            let height = scrollView.bounds.height / targetScale
            scrollView.zoom(to: CGRect(x: point.x - width / 2, y: point.y - height / 2, width: width, height: height), animated: true)
        }
    }
}

@available(iOS 26.0, *)
private struct BlueMindAttachmentPreview: View {
    let attachments: [BlueMindGlassAttachment]
    let initialAttachmentID: String
    let close: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var selectedAttachmentID: String

    init(attachments: [BlueMindGlassAttachment], initialAttachmentID: String, close: @escaping () -> Void) {
        self.attachments = attachments.filter { $0.image != nil }
        self.initialAttachmentID = initialAttachmentID
        self.close = close
        _selectedAttachmentID = State(initialValue: initialAttachmentID)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()

            TabView(selection: $selectedAttachmentID) {
                ForEach(attachments) { attachment in
                    BlueMindFullResolutionAttachmentPage(attachment: attachment)
                        .ignoresSafeArea()
                        .tag(attachment.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: attachments.count > 1 ? .automatic : .never))

            Button {
                dismiss()
                close()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .blueMindCircularGlassAction(isDark: true)
            }
            .buttonStyle(BlueMindHeaderButtonStyle())
            .safeAreaPadding(.top, 8)
            .padding(.leading, 16)
            .contentShape(Rectangle())
            .accessibilityLabel("Close image preview")
        }
        .preferredColorScheme(.dark)
    }
}

@available(iOS 26.0, *)
private struct BlueMindGlassOverlay: View {
    @ObservedObject var model: BlueMindGlassModel
    let action: (String, String?, String?, String?) -> Void
    let hitRegionsChanged: ([BlueMindGlassHitRegion]) -> Void
    @State private var composerTextHeight: CGFloat = 28
    @State private var manualComposerHeight: CGFloat?
    @State private var composerDragStartHeight: CGFloat?
    @State private var isResizingComposer = false
    @State private var isSelectorOpen = false
    @State private var previewAttachmentID: String?

    var body: some View {
        GeometryReader { proxy in
            let usableHeight = max(0, proxy.size.height - proxy.safeAreaInsets.top - proxy.safeAreaInsets.bottom)
            let compactSelectorHeight = min(
                min(350, max(280, usableHeight * 0.40)),
                max(230, usableHeight - 140)
            )
            let selectorHeight = model.isWritingMode || model.isAIPlanMode
                ? min(610, max(280, usableHeight - 150))
                : compactSelectorHeight
            let selectorWidth = model.isWritingMode || model.isAIPlanMode
                ? min(370, proxy.size.width - 24)
                : min(310, max(276, proxy.size.width - 52))

            ZStack(alignment: .topLeading) {
                if model.isVisible {
                    ZStack(alignment: .topLeading) {
                        if model.isHeaderVisible {
                            VStack(spacing: 8) {
                                topControls(selectorHeight: selectorHeight, selectorWidth: selectorWidth)
                                if model.chatSessionMode == "hidden" || model.chatSessionMode == "private" {
                                    chatModeStatus
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                            .transition(.opacity.combined(with: .scale(scale: 0.98)))
                            .zIndex(2)
                        }

                        if model.isComposerVisible {
                            VStack(spacing: 0) {
                                Spacer(minLength: 0)
                                composer(availableHeight: proxy.size.height - proxy.safeAreaInsets.top - proxy.safeAreaInsets.bottom)
                                    .padding(.horizontal, 12)
                                    .padding(.bottom, 8)
                                    .transition(.move(edge: .bottom).combined(with: .opacity))
                            }
                            .zIndex(3)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .blur(radius: model.isMenuOpen ? 0.65 : 0)
                    .opacity(model.isMenuOpen ? 0.82 : 1)
                    .mask {
                        if model.isMenuOpen && model.isDark {
                            RoundedRectangle(cornerRadius: 30, style: .continuous)
                                .padding(.top, proxy.safeAreaInsets.top)
                                .padding(.bottom, proxy.safeAreaInsets.bottom)
                        } else {
                            Rectangle()
                        }
                    }
                    .offset(x: model.isMenuOpen ? (model.isRTL ? -proxy.size.width * 0.819 : proxy.size.width * 0.819) : 0)
                    .allowsHitTesting(!model.isMenuOpen || model.isDark)
                    .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.32), value: model.isMenuOpen)
                }

                if model.isAuthBackVisible {
                    Button { action("authBack", nil, nil, nil) } label: {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .semibold))
                            .blueMindCircularGlassAction(isDark: model.isDark)
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityLabel("Back")
                    .blueMindGlassHitRegion(.authBack)
                    .padding(.leading, 16)
                    .padding(.top, 8)
                }

                if model.isSettingsCloseVisible {
                    HStack {
                        Spacer()
                        Button { action("settingsClose", nil, nil, nil) } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 17, weight: .semibold))
                                .blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Close Settings")
                        .accessibilityHint("Returns to the menu")
                        .blueMindGlassHitRegion(.settingsClose)
                    }
                    .padding(.trailing, 16)
                    .padding(.top, max(proxy.size.height * 0.04 + 8, proxy.safeAreaInsets.top - 4))
                    .offset(y: model.settingsPresentationOffsetY)
                }

                if model.isSettingsBackVisible {
                    Button { action("settingsBack", nil, nil, nil) } label: {
                        Image(systemName: "chevron.backward")
                            .font(.system(size: 20, weight: .semibold))
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back")
                    .accessibilityHint("Returns to the previous Settings page")
                    .blueMindGlassHitRegion(.settingsBack)
                    .padding(.leading, 12)
                    .padding(.top, max(proxy.size.height * 0.04 + 8, proxy.safeAreaInsets.top - 4))
                }


                if model.isRemindersHeaderVisible {
                    HStack {
                        Button { action("remindersBack", nil, nil, nil) } label: {
                            Image(systemName: "arrow.left")
                                .font(.system(size: 18, weight: .semibold))
                                .blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(BlueMindHeaderButtonStyle())
                        .accessibilityLabel("Back to chat")
                        .blueMindGlassHitRegion(.remindersBack)

                        Spacer()

                        Button { action("remindersAdd", nil, nil, nil) } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 19, weight: .semibold))
                                .blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(BlueMindHeaderButtonStyle())
                        .accessibilityLabel("Create reminder")
                        .blueMindGlassHitRegion(.remindersAdd)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                }


                if model.isReminderFormCloseVisible {
                    HStack {
                        Spacer()
                        Button { action("reminderFormClose", nil, nil, nil) } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 17, weight: .semibold))
                                .blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Close New Reminder")
                        .blueMindGlassHitRegion(.reminderFormClose)
                    }
                    .padding(.trailing, 20)
                    .padding(.top, max(proxy.size.height * 0.12 + 8, proxy.safeAreaInsets.top + 8))
                }


                if model.isScheduleHeaderVisible {
                    HStack {
                        Button { action("scheduleBack", nil, nil, nil) } label: {
                            Image(systemName: "arrow.left").font(.system(size: 18, weight: .semibold)).blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(BlueMindHeaderButtonStyle()).accessibilityLabel("Back to chat").blueMindGlassHitRegion(.scheduleBack)
                        Spacer()
                        Button { action("scheduleAdd", nil, nil, nil) } label: {
                            Image(systemName: "plus").font(.system(size: 19, weight: .semibold)).blueMindCircularGlassAction(isDark: model.isDark)
                        }
                        .buttonStyle(BlueMindHeaderButtonStyle()).accessibilityLabel("Create schedule").blueMindGlassHitRegion(.scheduleAdd)
                    }
                    .padding(.horizontal, 16).padding(.top, 8)
                }


                ForEach(model.nativeActionControls) { control in
                    Button { action("nativeControl", control.id, nil, nil) } label: {
                        Image(systemName: control.symbol)
                            .font(.system(size: 18, weight: .semibold))
                            .blueMindCircularGlassAction(isDark: model.isDark)
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityLabel(control.label)
                    .blueMindGlassHitRegion(.nativeControl(control.id))
                    .position(x: control.x + control.width / 2, y: control.y + control.height / 2)
                }

                if model.isStudioComposerVisible {
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        BlueMindStudioComposer(model: model) { studioAction, text in
                            action(studioAction, text, nil, nil)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(4)
                }
            }
        }
        .fullScreenCover(
            isPresented: Binding(
                get: { previewAttachmentID != nil },
                set: { if !$0 { previewAttachmentID = nil } }
            )
        ) {
            if let previewAttachmentID {
                BlueMindAttachmentPreview(
                    attachments: model.attachments,
                    initialAttachmentID: previewAttachmentID,
                    close: { self.previewAttachmentID = nil }
                )
            }
        }
        .environment(\.layoutDirection, model.isRTL ? .rightToLeft : .leftToRight)
        .preferredColorScheme(model.isDark ? .dark : .light)
        .opacity(model.isVisible || model.isStudioComposerVisible || model.isAuthBackVisible || model.isSettingsCloseVisible || model.isSettingsBackVisible || model.isRemindersHeaderVisible || model.isReminderFormCloseVisible || model.isScheduleHeaderVisible || !model.nativeActionControls.isEmpty ? 1 : 0)
        .animation(.easeInOut(duration: 0.16), value: model.isVisible)
        .animation(.easeInOut(duration: 0.16), value: model.isAuthBackVisible)
        .animation(.smooth(duration: 0.28), value: model.isComposerVisible)
        .animation(.smooth(duration: 0.24), value: model.isHeaderVisible)
        .animation(.smooth(duration: 0.22), value: isSelectorOpen)
        .coordinateSpace(name: "BlueMindNativeGlassOverlay")
        .onPreferenceChange(BlueMindGlassHitRegionPreferenceKey.self, perform: hitRegionsChanged)
        .onChange(of: model.isVisible) { visible in
            if !visible { isSelectorOpen = false }
        }
        .onChange(of: model.text) { text in
            if text.isEmpty, manualComposerHeight != nil {
                manualComposerHeight = nil
                withAnimation(.smooth(duration: 0.24)) { composerTextHeight = 28 }
            }
        }
    }

    private func topControls(selectorHeight: CGFloat, selectorWidth: CGFloat) -> some View {
        HStack {
            Button { action("menu", nil, nil, nil) } label: {
                Group {
                    if model.isAIPlanMode {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .semibold))
                    } else {
                        VStack(alignment: .leading, spacing: 3.5) {
                            Capsule().frame(width: 20, height: 2.2)
                            Capsule().frame(width: 16, height: 2.2)
                            Capsule().frame(width: 12, height: 2.2)
                        }
                    }
                }
                .foregroundStyle(.white)
                .blueMindCircularGlassAction(isDark: model.isDark)
            }
            .buttonStyle(BlueMindHeaderButtonStyle())
            .accessibilityLabel(model.isAIPlanMode ? "Back" : "Open menu")
            .blueMindGlassHitRegion(.menuButton)

            Spacer(minLength: 12)

            Button {
                withAnimation(.smooth(duration: 0.22)) { isSelectorOpen.toggle() }
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: model.currentMode.symbol)
                    Text(model.headerTitlePrefix.isEmpty ? model.currentMode.title : "\(model.headerTitlePrefix) · \(model.currentMode.title)")
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.semibold))
                }
                .font(.subheadline.weight(.bold))
                .padding(.horizontal, 15)
                .frame(minWidth: 174, minHeight: 46)
                .glassEffect(.regular.interactive(), in: Capsule())
                .shadow(color: .black.opacity(model.isDark ? 0.3 : 0.14), radius: 12, y: 7)
            }
            .buttonStyle(BlueMindHeaderButtonStyle())
            .accessibilityLabel("Select AI mode")
            .blueMindGlassHitRegion(.header)
            .popover(
                isPresented: $isSelectorOpen,
                attachmentAnchor: .rect(.bounds),
                arrowEdge: .top
            ) {
                selectorPanel(maxHeight: selectorHeight)
                    .frame(width: selectorWidth)
                    .presentationCompactAdaptation(.popover)
                    .preferredColorScheme(model.isDark ? .dark : .light)
            }

            Spacer(minLength: 12)

            Button { action(model.isAIPlanMode ? "aiPlanTools" : model.isWritingMode ? "writingTools" : "newChat", nil, nil, nil) } label: {
                Image(systemName: (model.isWritingMode || model.isAIPlanMode) ? "wand.and.stars" : "square.and.pencil")
                    .font(.system(size: 18, weight: .semibold))
                    .blueMindCircularGlassAction(isDark: model.isDark)
            }
            .buttonStyle(BlueMindHeaderButtonStyle())
            .accessibilityLabel(model.isAIPlanMode ? "AI Plan Tools" : model.isWritingMode ? "Writing Tools" : "New chat")
            .blueMindGlassHitRegion(.header)
        }
    }

    private func selectorPanel(maxHeight: CGFloat) -> some View {
        let compact = !model.isWritingMode && !model.isAIPlanMode
        let rowHeight: CGFloat = compact ? 42 : 46
        let rowCornerRadius: CGFloat = compact ? 13 : 15

        return ScrollView(.vertical, showsIndicators: true) {
            LazyVStack(alignment: .leading, spacing: compact ? 4 : 7) {
                if !model.isWritingMode && !model.isAIPlanMode {
                    selectorSectionTitle("BlueMind Models")
                    ForEach(model.models) { option in
                        let selected = model.selectedModel == option.id
                        Button {
                            withAnimation(.smooth(duration: 0.2)) {
                                model.selectedModel = option.id
                            }
                            action("selectModel", nil, option.id, nil)
                        } label: {
                            HStack(spacing: 10) {
                                Text(option.title)
                                    .font(.body.weight(.semibold))
                                if !option.badge.isEmpty {
                                    Text(option.badge)
                                        .font(.caption2.weight(.bold))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(model.accentColor.opacity(0.22), in: Capsule())
                                }
                                Spacer(minLength: 8)
                                if selected {
                                    Image(systemName: "checkmark")
                                        .font(.body.weight(.bold))
                                        .transition(.scale.combined(with: .opacity))
                                }
                            }
                            .padding(.horizontal, compact ? 11 : 13)
                            .frame(minHeight: rowHeight)
                            .background(selected ? Color.white.opacity(0.105) : Color.clear, in: RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                            .contentShape(RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                        }
                        .buttonStyle(BlueMindHeaderButtonStyle())
                        .accessibilityAddTraits(selected ? .isSelected : [])
                    }
                }

                selectorSectionTitle(model.isWritingMode || model.isAIPlanMode ? "Types" : "AI Modes")
                    .padding(.top, model.isWritingMode || model.isAIPlanMode ? 0 : 8)
                ForEach(model.modes) { mode in
                    let selected = model.selectedMode == mode.id
                    Button {
                        withAnimation(.smooth(duration: 0.2)) {
                            model.selectedMode = mode.id
                        }
                        action("selectMode", nil, mode.id, nil)
                    } label: {
                        HStack(spacing: 11) {
                            Image(systemName: mode.symbol)
                                .font(.system(size: 17, weight: .semibold))
                                .frame(width: 24)
                            Text(mode.title)
                                .font(.body.weight(.semibold))
                            Spacer(minLength: 8)
                            if selected {
                                Image(systemName: "checkmark")
                                    .font(.body.weight(.bold))
                                    .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .padding(.horizontal, compact ? 11 : 13)
                        .frame(minHeight: rowHeight)
                        .background(selected ? Color.white.opacity(0.105) : Color.clear, in: RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                        .contentShape(RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }

                if !model.isWritingMode && !model.isAIPlanMode {
                    selectorSectionTitle("Thinking")
                        .padding(.top, 8)
                    Button {
                        withAnimation(.smooth(duration: 0.2)) {
                            model.thinkingEnabled.toggle()
                        }
                        action("toggleThinking", nil, nil, nil)
                    } label: {
                        HStack(spacing: 11) {
                            Image(systemName: "brain")
                                .font(.system(size: 17, weight: .semibold))
                                .frame(width: 24)
                            Text("Enable Thinking")
                                .font(.body.weight(.semibold))
                            Spacer(minLength: 8)
                            if model.thinkingEnabled {
                                Image(systemName: "checkmark")
                                    .font(.body.weight(.bold))
                                    .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .padding(.horizontal, compact ? 11 : 13)
                        .frame(minHeight: compact ? 42 : 48)
                        .background(model.thinkingEnabled ? Color.white.opacity(0.105) : Color.clear, in: RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                        .contentShape(RoundedRectangle(cornerRadius: rowCornerRadius, style: .continuous))
                    }
                    .buttonStyle(BlueMindHeaderButtonStyle())
                    .accessibilityAddTraits(model.thinkingEnabled ? .isSelected : [])
                }
            }
            .padding(compact ? 10 : 12)
        }
        .frame(height: maxHeight)
        .foregroundStyle(.primary)
    }

    private func selectorSectionTitle(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption2.weight(.bold))
            .foregroundStyle(.secondary)
            .tracking(0.8)
            .padding(.horizontal, 10)
            .padding(.bottom, 1)
    }

    private var chatModeStatus: some View {
        HStack(spacing: 10) {
            Image(systemName: model.chatSessionMode == "private" ? "lock.fill" : "eyeglasses")
                .font(.system(size: 14, weight: .semibold))
            Text(model.modeStatusTitle)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)

            Spacer(minLength: 10)

            Button { action("exitChatMode", nil, nil, nil) } label: {
                Text(model.modeExitTitle)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(model.accentColor)
                    .frame(minHeight: 32)
                    .padding(.horizontal, 10)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(model.modeExitTitle)
        }
        .foregroundStyle(.primary)
        .padding(.leading, 14)
        .padding(.trailing, 6)
        .frame(minHeight: 42)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
        .blueMindGlassHitRegion(.header)
    }

    private func composer(availableHeight: CGFloat) -> some View {
        let automaticMaximumHeight = min(210, max(126, availableHeight * 0.24))
        let criticalTopClearance: CGFloat = model.isHeaderVisible
            ? ((model.chatSessionMode == "hidden" || model.chatSessionMode == "private") ? 118 : 68)
            : 20
        let composerChromeHeight: CGFloat = 52
        let reservedHeight: CGFloat = criticalTopClearance
            + composerChromeHeight
            + (model.attachments.isEmpty ? 0 : 120)
            + (model.quickActions.isEmpty ? 0 : 42)
        let manualMaximumHeight = max(automaticMaximumHeight, availableHeight - reservedHeight)
        let showsResizeHandle = manualComposerHeight != nil || composerTextHeight >= automaticMaximumHeight - 4

        return VStack(spacing: 8) {
            if !model.quickActions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(model.quickActions, id: \.self) { title in
                            Button { action(model.isAIPlanMode ? "aiPlanQuickAction" : "writingQuickAction", title, nil, nil) } label: {
                                Text(title)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal, 12)
                                    .frame(minHeight: 34)
                                    .glassEffect(.regular.interactive(), in: Capsule())
                            }
                            .buttonStyle(BlueMindHeaderButtonStyle())
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }

            VStack(spacing: 8) {
                if showsResizeHandle && !model.isListening && model.voiceStatus == "idle" {
                    composerResizeHandle(maximumHeight: manualMaximumHeight)
                        .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }

                if !model.attachments.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(model.attachments) { attachment in
                                attachmentPreview(attachment)
                                    .transition(.scale(scale: 0.86).combined(with: .opacity))
                            }
                        }
                        .padding(.horizontal, 1)
                    }
                }

                HStack(alignment: .bottom, spacing: 8) {
                    if model.isListening || model.voiceStatus == "requesting" || model.voiceStatus == "transcribing" || model.voiceStatus == "sending" {
                        voiceControlButton(symbol: "xmark", label: "Cancel voice input") {
                            action("voiceCancel", nil, nil, nil)
                        }
                        .disabled(model.voiceStatus == "transcribing" || model.voiceStatus == "sending")

                        if model.voiceStatus == "transcribing" || model.voiceStatus == "sending" {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .controlSize(.small)
                                Text(model.voiceStatus == "sending" ? "Sending…" : "Transcribing…")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, minHeight: 36)
                            .transition(.blurReplace)
                        } else {
                            voiceSurface
                                .frame(maxWidth: .infinity)
                                .transition(.blurReplace)
                        }

                        voiceControlButton(symbol: "stop.fill", label: "Stop and transcribe") {
                            action("voiceStop", nil, nil, nil)
                        }
                        .disabled(model.voiceStatus != "listening")

                        voiceSendButton {
                            action("voiceSend", nil, nil, nil)
                        }
                        .disabled(model.voiceStatus != "listening")
                    } else {
                        if model.isWritingMode || model.isAIPlanMode {
                            Menu {
                                Button { action(model.isAIPlanMode ? "aiPlanFiles" : "writingFiles", nil, nil, nil) } label: {
                                    Label("Files", systemImage: "doc")
                                }
                                Button { action(model.isAIPlanMode ? "aiPlanPhotos" : "writingPhotos", nil, nil, nil) } label: {
                                    Label("Photos", systemImage: "photo.on.rectangle")
                                }
                                Button { action(model.isAIPlanMode ? "aiPlanCamera" : "writingCamera", nil, nil, nil) } label: {
                                    Label("Camera", systemImage: "camera")
                                }
                            } label: {
                                Image(systemName: "plus")
                                    .font(.system(size: 17, weight: .semibold))
                                    .frame(width: 36, height: 36)
                                    .contentShape(Circle())
                            }
                            .menuOrder(.fixed)
                            .buttonStyle(BlueMindComposerButtonStyle())
                            .disabled(model.isUploadingAttachments)
                            .accessibilityLabel("Add writing attachment")
                        } else {
                            composerButton(symbol: "plus", label: "Add attachment") {
                                action("plus", nil, nil, nil)
                            }
                            .disabled(model.isUploadingAttachments)
                        }

                        ZStack(alignment: model.isRTL ? .topTrailing : .topLeading) {
                            if model.text.isEmpty {
                                Text(model.composerPlaceholder)
                                    .foregroundStyle(.secondary)
                                    .padding(.top, 5)
                                    .allowsHitTesting(false)
                            }
                            BlueMindComposerTextView(
                                text: $model.text,
                                height: $composerTextHeight,
                                isRTL: model.isRTL,
                                automaticMaximumHeight: automaticMaximumHeight,
                                isManuallySized: manualComposerHeight != nil
                            ) { value in
                                if value.isEmpty {
                                    manualComposerHeight = nil
                                }
                                action("textChanged", value, nil, nil)
                            }
                            .frame(height: composerTextHeight)
                        }
                        .frame(maxWidth: .infinity)
                        .transition(.blurReplace)

                        composerButton(symbol: "mic", label: "Start voice input") {
                            action("microphone", nil, nil, nil)
                        }

                        sendButton
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 28))
            .animation(isResizingComposer ? nil : .smooth(duration: 0.32), value: composerTextHeight)
            .animation(.smooth(duration: 0.34), value: model.isListening)
        }
        .onChange(of: availableHeight) { _ in
            guard let manualComposerHeight else { return }
            let clamped = min(manualMaximumHeight, max(28, manualComposerHeight))
            self.manualComposerHeight = clamped
            composerTextHeight = clamped
        }
        .animation(.smooth(duration: 0.34), value: model.attachments.map(\.id))
        .blueMindGlassHitRegion(.composer)
    }

    private func composerResizeHandle(maximumHeight: CGFloat) -> some View {
        VStack(spacing: 2) {
            Image(systemName: "chevron.up.chevron.down")
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(.secondary.opacity(0.72))
            Capsule()
                .fill(.secondary.opacity(0.58))
                .frame(width: 34, height: 4)
        }
        .frame(width: 88, height: 24)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .global)
                .onChanged { value in
                    if composerDragStartHeight == nil {
                        composerDragStartHeight = composerTextHeight
                        isResizingComposer = true
                    }
                    let startHeight = composerDragStartHeight ?? composerTextHeight
                    let nextHeight = min(maximumHeight, max(28, startHeight - value.translation.height))
                    manualComposerHeight = nextHeight
                    composerTextHeight = nextHeight
                }
                .onEnded { _ in
                    composerDragStartHeight = nil
                    isResizingComposer = false
                }
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Resize message composer")
        .accessibilityHint("Drag up to expand or down to collapse")
        .accessibilityAdjustableAction { direction in
            let step: CGFloat = 44
            let current = manualComposerHeight ?? composerTextHeight
            let next: CGFloat
            switch direction {
            case .increment: next = min(maximumHeight, current + step)
            case .decrement: next = max(28, current - step)
            @unknown default: return
            }
            manualComposerHeight = next
            withAnimation(.smooth(duration: 0.22)) { composerTextHeight = next }
        }
    }

    private func attachmentPreview(_ attachment: BlueMindGlassAttachment) -> some View {
        ZStack(alignment: .topTrailing) {
            Button {
                if attachment.image != nil {
                    previewAttachmentID = attachment.id
                }
            } label: {
                Group {
                    if let image = attachment.image {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                    } else {
                        VStack(spacing: 7) {
                            Image(systemName: attachment.type == "pdf" ? "doc.richtext" : "doc")
                                .font(.system(size: 28, weight: .regular))
                                .foregroundStyle(model.brandPrimaryColor ?? model.accentColor)
                            Text(attachment.name)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.thinMaterial)
                    }
                }
                .frame(width: 112, height: 112)
                .clipShape(.rect(cornerRadius: 18))
            }
            .buttonStyle(.plain)
            .disabled(attachment.image == nil)
            .accessibilityLabel("Preview \(attachment.name)")

            Button { action("removeAttachment", nil, nil, attachment.id) } label: {
                Image(systemName: "xmark")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .frame(width: 24, height: 24)
                    .background(.black.opacity(0.58), in: Circle())
            }
            .buttonStyle(BlueMindComposerButtonStyle())
            .padding(4)
            .accessibilityLabel("Remove \(attachment.name)")

            if attachment.uploadState == "uploading" {
                ProgressView()
                    .controlSize(.small)
                    .tint(.white)
                    .padding(6)
                    .background(.black.opacity(0.48), in: Circle())
                    .offset(x: -83, y: 83)
                    .allowsHitTesting(false)
            } else if attachment.uploadState == "failed" {
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(.white, .red)
                    .offset(x: -86, y: 86)
                    .allowsHitTesting(false)
            }
        }
    }

    private var voiceSurface: some View {
        GeometryReader { geometry in
            let barWidth: CGFloat = 3
            let gap: CGFloat = 3
            let capacity = max(8, Int((geometry.size.width + gap) / (barWidth + gap)))
            let liveLevels = Array(model.audioLevels.suffix(capacity))
            let silentPadding = Array(
                repeating: 0.08,
                count: max(0, capacity - liveLevels.count)
            )
            let visibleLevels = silentPadding + liveLevels

            HStack(alignment: .center, spacing: gap) {
                ForEach(Array(visibleLevels.enumerated()), id: \.offset) { index, level in
                    let activity = max(0, min(1, (level - 0.08) / 0.92))
                    let idleFlow = Double((UInt64(index) + model.audioVisualizationFrame) % 7) / 6
                    Capsule()
                        .fill((model.brandPrimaryColor ?? model.accentColor).opacity(0.24 + idleFlow * 0.06 + activity * 0.70))
                        .frame(width: barWidth, height: 3 + CGFloat(activity) * 15)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height, alignment: .trailing)
            .clipped()
            .environment(\.layoutDirection, .leftToRight)
        }
        .frame(height: 36)
        .animation(.linear(duration: 0.07), value: model.audioLevels)
        .accessibilityLabel("Recording voice")
    }

    private func composerButton(symbol: String, label: String, action buttonAction: @escaping () -> Void) -> some View {
        Button(action: buttonAction) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 36, height: 36)
                .contentShape(Circle())
        }
        .buttonStyle(BlueMindComposerButtonStyle())
        .accessibilityLabel(label)
    }

    private func voiceControlButton(symbol: String, label: String, action buttonAction: @escaping () -> Void) -> some View {
        Button(action: buttonAction) {
            Image(systemName: symbol)
                .font(.system(size: symbol == "stop.fill" ? 13 : 16, weight: .semibold))
                .foregroundStyle(.white.opacity(0.94))
                .frame(width: 36, height: 36)
                .background(.white.opacity(0.12), in: Circle())
                .overlay {
                    Circle().stroke(.white.opacity(0.10), lineWidth: 0.75)
                }
        }
        .buttonStyle(BlueMindComposerButtonStyle())
        .accessibilityLabel(label)
    }

    private func voiceSendButton(action buttonAction: @escaping () -> Void) -> some View {
        Button(action: buttonAction) {
            Image(systemName: "arrow.up")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.black)
                .frame(width: 36, height: 36)
                .background(.white, in: Circle())
        }
        .buttonStyle(BlueMindComposerButtonStyle())
        .accessibilityLabel("Send voice as text")
    }

    @ViewBuilder
    private var sendButton: some View {
        if model.canSend {
            Button { action(model.isSending ? "stop" : "send", model.text, nil, nil) } label: {
                Image(systemName: model.isSending ? "stop.fill" : "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .frame(width: 36, height: 36)
                    .foregroundStyle(.white)
                    .background(model.accentColor, in: Circle())
            }
            .buttonStyle(BlueMindComposerButtonStyle())
            .accessibilityLabel(model.isSending ? "Stop response" : "Send message")
        } else {
            Button(action: {}) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .frame(width: 36, height: 36)
                    .foregroundStyle(.secondary)
                    .background(.secondary.opacity(0.12), in: Circle())
            }
            .buttonStyle(BlueMindComposerButtonStyle())
            .disabled(true)
            .accessibilityLabel("Send message")
        }
    }
}

@available(iOS 26.0, *)
private final class BlueMindPassThroughView: UIView {
    var interactiveRegions: [BlueMindGlassHitRegion] = []
    var isOverlayVisible: () -> Bool = { false }
    var isRegionInteractive: (BlueMindGlassHitRegion) -> Bool = { _ in false }
    var isPointVisible: (CGPoint) -> Bool = { _ in true }

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        guard isOverlayVisible(), isPointVisible(point) else { return false }
        return interactiveRegions.contains { isRegionInteractive($0) && $0.frame.contains(point) }
    }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard self.point(inside: point, with: event) else { return nil }
        return super.hitTest(point, with: event)
    }
}

final class BlueMindBridgeViewController: CAPBridgeViewController {
    private let nativeGlassPlugin = BlueMindNativeGlassPlugin()
    private let secureSessionPlugin = BlueMindSecureSessionPlugin()
    private let nativeVoicePlugin = BlueMindNativeVoicePlugin()
    private var nativeGlassHost: UIViewController?
    private weak var nativeGlassOverlayView: UIView?
    private var conversationContextMenu: AnyObject?
    private var drawerGestureCoordinator: AnyObject?
    private var privacyShieldView: UIView?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(nativeGlassPlugin)
        bridge?.registerPluginInstance(secureSessionPlugin)
        bridge?.registerPluginInstance(nativeVoicePlugin)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(protectAppSwitcherSnapshot),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
#if DEBUG
        print("[BlueMindNativeGlass] boot", BlueMindNativeGlassPlugin.auditBuild)
#endif

        if #available(iOS 16.0, *), let webView = bridge?.webView {
            conversationContextMenu = BlueMindConversationContextMenu(webView: webView) { [weak nativeGlassPlugin] action, conversationID, text in
                Task { @MainActor in
                    nativeGlassPlugin?.emit(action, text: text, conversationID: conversationID)
                }
            }
            installNativeTextSelectionAction(in: webView)
        }

        guard #available(iOS 26.0, *) else { return }
        installNativeGlassOverlay()
        let passThroughView = nativeGlassOverlayView as? BlueMindPassThroughView
        drawerGestureCoordinator = BlueMindDrawerGestureCoordinator(
            view: view,
            model: nativeGlassPlugin.model,
            excludesOutsideTap: { [weak passThroughView] point in
                passThroughView?.interactiveRegions.contains {
                    $0.kind == .menuButton && $0.frame.contains(point)
                } ?? false
            }
        ) { [weak nativeGlassPlugin] action in
            Task { @MainActor in
                nativeGlassPlugin?.emit(action)
            }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(askBlueMindAboutSelectedText(_:)) {
            return bridge?.webView != nil
        }
        return super.canPerformAction(action, withSender: sender)
    }

    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == .context else { return }

        let askBlueMind = UICommand(
            title: "Ask BlueMind",
            image: UIImage(systemName: "sparkles"),
            action: #selector(askBlueMindAboutSelectedText(_:))
        )
        let primaryAction = UIMenu(
            title: "",
            options: .displayInline,
            children: [askBlueMind]
        )
        builder.insertChild(primaryAction, atStartOfMenu: .standardEdit)
    }

    private func installNativeTextSelectionAction(in webView: WKWebView) {
        let script = """
        (() => {
          if (window.__blueMindNativeSelectionInstalled) return;
          window.__blueMindNativeSelectionInstalled = true;
          window.__blueMindLastSelectedText = '';
          document.addEventListener('selectionchange', () => {
            const selected = window.getSelection?.()?.toString?.() || '';
            if (selected) window.__blueMindLastSelectedText = selected;
          }, { capture: true, passive: true });
        })()
        """
        webView.configuration.userContentController.addUserScript(
            WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        )
        webView.evaluateJavaScript(script)
        UIMenuSystem.context.setNeedsRebuild()
    }

    @objc private func askBlueMindAboutSelectedText(_ sender: Any?) {
        guard let webView = bridge?.webView else { return }
        let script = """
        (() => {
          const live = window.getSelection?.()?.toString?.() || '';
          const selected = live || window.__blueMindLastSelectedText || '';
          window.__blueMindLastSelectedText = '';
          return selected;
        })()
        """
        webView.evaluateJavaScript(script) { [weak self] result, _ in
            guard let self, let selectedText = result as? String,
                  !selectedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            Task { @MainActor in
                self.nativeGlassPlugin.emit("askSelectedText", text: selectedText)
            }
        }
    }

    @objc private func protectAppSwitcherSnapshot() {
#if DEBUG
        print("[BlueMind lifecycle] app will resign active mode=\(nativeGlassPlugin.model.chatSessionMode)")
#endif
        let containsProtectedChat = nativeGlassPlugin.requiresProtectedAppSwitcherSnapshot
        setPrivacyShieldVisible(containsProtectedChat)
#if DEBUG
        print("[BlueMind lifecycle] snapshot protection required=\(containsProtectedChat)")
#endif
    }

    func setPrivacyShieldVisible(_ visible: Bool) {
        if visible {
            guard privacyShieldView == nil else { return }
            let shield = UIView(frame: view.bounds)
            shield.backgroundColor = .black
            shield.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            shield.isAccessibilityElement = true
            shield.accessibilityLabel = "BlueMind is locked"
            view.addSubview(shield)
            privacyShieldView = shield
#if DEBUG
            print("[BlueMind FaceID] native privacy shield installed")
#endif
            return
        }
        privacyShieldView?.removeFromSuperview()
        privacyShieldView = nil
#if DEBUG
        print("[BlueMind FaceID] native privacy shield removed; root UI visible=\(view.window != nil)")
#endif
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let privacyShieldView {
            view.bringSubviewToFront(privacyShieldView)
            return
        }
        if let nativeGlassOverlayView {
            view.bringSubviewToFront(nativeGlassOverlayView)
        }
    }

    @available(iOS 26.0, *)
    private func installNativeGlassOverlay() {
        let passThroughView = BlueMindPassThroughView(frame: view.bounds)
        passThroughView.backgroundColor = .clear
        passThroughView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        passThroughView.isOverlayVisible = { [weak nativeGlassPlugin] in
            guard let model = nativeGlassPlugin?.model else { return false }
            return model.isVisible || model.isStudioComposerVisible || model.isAuthBackVisible || model.isSettingsCloseVisible || model.isSettingsBackVisible || model.isRemindersHeaderVisible || model.isReminderFormCloseVisible || model.isScheduleHeaderVisible || !model.nativeActionControls.isEmpty
        }
        passThroughView.isRegionInteractive = { [weak nativeGlassPlugin] region in
            guard let model = nativeGlassPlugin?.model else { return false }
            switch region.kind {
            case .authBack: return model.isAuthBackVisible
            case .settingsClose: return model.isSettingsCloseVisible
            case .settingsBack: return model.isSettingsBackVisible
            case .remindersBack, .remindersAdd: return model.isRemindersHeaderVisible
            case .reminderFormClose: return model.isReminderFormCloseVisible
            case .scheduleBack, .scheduleAdd: return model.isScheduleHeaderVisible
            case .nativeControl(let id): return model.nativeActionControls.contains(where: { $0.id == id })
            case .studioComposer: return model.isStudioComposerVisible
            case .menuButton: return model.isHeaderVisible && (!model.isMenuOpen || model.isDark)
            case .header: return model.isHeaderVisible && !model.isMenuOpen
            case .composer: return model.isComposerVisible && !model.isMenuOpen
            }
        }
        passThroughView.isPointVisible = { [weak nativeGlassPlugin, weak passThroughView] point in
            guard let model = nativeGlassPlugin?.model, let passThroughView else { return false }
            if model.isStudioComposerVisible || model.isAuthBackVisible || model.isSettingsCloseVisible || model.isSettingsBackVisible || model.isRemindersHeaderVisible || model.isReminderFormCloseVisible || model.isScheduleHeaderVisible || !model.nativeActionControls.isEmpty { return true }
            guard model.isMenuOpen && model.isDark else { return true }
            let visibleWidth = passThroughView.bounds.width * 0.16
            return model.isRTL ? point.x <= visibleWidth : point.x >= passThroughView.bounds.width - visibleWidth
        }

        let content = BlueMindGlassOverlay(model: nativeGlassPlugin.model) { [weak nativeGlassPlugin] action, text, mode, attachmentID in
            nativeGlassPlugin?.emit(action, text: text, mode: mode, attachmentID: attachmentID)
        } hitRegionsChanged: { [weak passThroughView] regions in
            passThroughView?.interactiveRegions = regions
        }
        let hostingController = UIHostingController(rootView: content)
        hostingController.view.backgroundColor = .clear

        addChild(hostingController)
        hostingController.view.frame = passThroughView.bounds
        hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        passThroughView.addSubview(hostingController.view)
        view.addSubview(passThroughView)
        nativeGlassOverlayView = passThroughView
        hostingController.didMove(toParent: self)
        nativeGlassHost = hostingController
    }
}

private extension Color {
    init(hex: String) {
        let value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var rgb: UInt64 = 0
        Scanner(string: value).scanHexInt64(&rgb)
        let red = Double((rgb >> 16) & 0xFF) / 255
        let green = Double((rgb >> 8) & 0xFF) / 255
        let blue = Double(rgb & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
