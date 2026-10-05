import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { setupCapacitorRuntime } from "@/capacitorRuntime";
import { runDevAuthStartupCleanup } from "@/services/devAuthCleanup";
import { hydrateSecureAuthSession } from "@/services/secureSessionStorage";
import { registerServiceWorker } from "@/services/serviceWorkerRegistration";

async function bootstrap() {
  const capacitorRuntime = await setupCapacitorRuntime();
  try {
    await hydrateSecureAuthSession();
  } catch (error) {
    console.error("[BlueMind auth] Secure session hydration failed", error?.code || error?.message || "unknown");
  }
  await runDevAuthStartupCleanup({ isNative: capacitorRuntime.isNative });

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  if (!capacitorRuntime.isNative) {
    registerServiceWorker();
  }
}

bootstrap();
