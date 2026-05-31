import { Navigate } from "react-router-dom";

export default function MobileCreateImage() {
  return <Navigate to="/mobile/chat?mode=image" replace />;
}
