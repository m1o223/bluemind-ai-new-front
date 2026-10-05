import { Navigate } from "react-router-dom";
import { isNativeIOSApp } from "@/capacitorRuntime";
import IOSCreateShell from "@/mobile/components/IOSCreateShell";

export default function MobileCreateImage() {
  if (isNativeIOSApp()) {
    return (
      <section className="h-full min-h-0 px-4">
        <IOSCreateShell />
      </section>
    );
  }

  return <Navigate to="/mobile/chat?mode=image" replace />;
}
