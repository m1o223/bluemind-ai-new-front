import { useNavigate, useParams } from "react-router-dom";

import SettingsSheet from "@/components/settings/SettingsSheet";

export default function SettingsPage({ mobile = false }) {
  const navigate = useNavigate();
  const { sectionId } = useParams();

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
