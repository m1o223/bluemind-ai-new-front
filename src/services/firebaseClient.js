import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

function hasFirebaseAuthConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

export function getFirebaseAuthConfigStatus() {
  return {
    ready: hasFirebaseAuthConfig(),
    missing: Object.entries({
      REACT_APP_FIREBASE_API_KEY: firebaseConfig.apiKey,
      REACT_APP_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
      REACT_APP_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
      REACT_APP_FIREBASE_APP_ID: firebaseConfig.appId,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key),
  };
}

let firebaseApp;
let firebaseAuth;

export async function signInWithFirebaseGoogle() {
  const configStatus = getFirebaseAuthConfigStatus();

  if (!configStatus.ready) {
    const error = new Error("Firebase Google sign-in configuration is missing.");
    error.code = "FIREBASE_AUTH_CONFIG_MISSING";
    error.missing = configStatus.missing;
    throw error;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(firebaseAuth, provider);
  return credential.user.getIdToken();
}
