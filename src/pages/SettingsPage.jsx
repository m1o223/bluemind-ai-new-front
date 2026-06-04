import { useNavigate, useParams } from "react-router-dom";

import DesktopSettingsPanel from "@/components/settings/DesktopSettingsPanel";
import SettingsSheet from "@/components/settings/SettingsSheet";

export default function SettingsPage({ mobile = false }) {
  const navigate = useNavigate();
  const { sectionId } = useParams();

  if (!mobile) {
    return <DesktopSettingsPanel initialSection={sectionId || "home"} />;
  }

  return (
    <SettingsSheet
      open
      mobile={mobile}
      overlay={false}
      initialPane={sectionId || "main"}
      onClose={() => navigate(mobile ? "/mobile/chat" : "/chat", { replace: true })}
    />
  );
}
