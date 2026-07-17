import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { setupCapacitorRuntime } from "@/capacitorRuntime";
import { runDevAuthStartupCleanup } from "@/services/devAuthCleanup";
import { registerServiceWorker } from "@/services/serviceWorkerRegistration";

async function bootstrap() {
  const capacitorRuntime = await setupCapacitorRuntime();
  await runDevAuthStartupCleanup();

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
