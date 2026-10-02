import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function ProtectedRoute({ children }) {
  const { user, authReady } = useStore();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="app-boot app-boot-inline" role="status">
        <span className="app-boot-mark">✦</span>
        <p>Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/account/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
