# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Native Platforms

The React application in `src/` is shared by the web, Android, and iOS builds. Capacitor copies the production build from `dist/` into each native project.

- `android/` contains the existing Android project.
- `ios/` contains the iPhone project and is committed so a fresh clone does not depend on files from one Mac.
- The native app identifier is `com.bluemind.ai` and the iOS deployment target is 15.0.

To prepare iOS after cloning:

```bash
npm ci
npm run cap:sync:ios
npm run ios:open
```

The last command requires a full Xcode installation. Select the BlueMind development team in Signing & Capabilities before running on a physical device or distributing through TestFlight/App Store Connect. Do not commit `xcuserdata`, Derived Data, signing certificates, provisioning profiles, or local build products.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Android App With Capacitor

BlueMind AI uses Capacitor to package the existing React web app as a native Android WebView application.

### Requirements

- Node.js 22 LTS recommended.
- Android Studio with the Android SDK installed.
- JDK 17 or newer.
- A configured Android emulator or a physical Android phone with USB debugging enabled.

### Setup after cloning

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

### Run on Android

To run from the command line:

```bash
npm run android:run
```

To run from Android Studio:

1. Run `npm run build`.
2. Run `npx cap sync android`.
3. Run `npx cap open android`.
4. Select an emulator or connected phone.
5. Press Run.

### Sync future frontend changes

Whenever the React frontend changes, rebuild and sync the Android project:

```bash
npm run build
npx cap sync android
```

### Environment variables

The Android app uses the same frontend environment variables as the web app. Create local environment files from `.env.example` as needed, and never commit secret values.

Required production variables include:

- `REACT_APP_API_URL`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_VAPID_KEY`
- `REACT_APP_WEB_PUSH_PUBLIC_KEY`

### Files that must not be committed

Do not commit `node_modules/`, `dist/`, Android build folders, `local.properties`, signing keys, keystores, generated APK/AAB files, logs, or `.env` files containing secrets.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
