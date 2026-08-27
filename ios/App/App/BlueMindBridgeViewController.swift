import Capacitor
import UIKit
import WebKit

/// Keeps the Capacitor WKWebView edge-to-edge so the React theme paints behind
/// the real iOS status bar instead of exposing a separate native color strip.
final class BlueMindBridgeViewController: CAPBridgeViewController {
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        return webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
    }
}
