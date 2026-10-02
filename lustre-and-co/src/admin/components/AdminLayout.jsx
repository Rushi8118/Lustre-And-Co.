import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import api from "../../services/api";

const EMPTY_ATTENTION = { pendingReviews: 0, newMessages: 0, openOrders: 0, lowStock: 0 };

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attention, setAttention] = useState(EMPTY_ATTENTION);
  const location = useLocation();

  const refreshAttention = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/dashboard", { params: { days: 7 } });
      setAttention(data.attention || EMPTY_ATTENTION);
    } catch {
      // Counts are a convenience; pages still work without them.
    }
  }, []);

  useEffect(() => {
    refreshAttention();
  }, [refreshAttention, location.pathname]);

  return (
    <div className="admin-shell">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} attention={attention} />

      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setSidebarOpen(true)} attention={attention} />

        <main className="admin-content">
          <Outlet context={{ attention, refreshAttention }} />
        </main>
      </div>
    </div>
  );
}
