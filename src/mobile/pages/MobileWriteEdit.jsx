import { Navigate } from "react-router-dom";

export default function MobileWriteEdit() {
  return <Navigate to="/mobile/chat?mode=write-edit" replace />;
}
