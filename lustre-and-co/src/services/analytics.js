import api from "./api";

export async function trackAnalyticsEvent(payload) {
  const { data } = await api.post("/analytics/events", payload);
  return data;
}

export async function getAnalyticsDashboard(params = {}) {
  const { data } = await api.get("/admin/analytics/dashboard", { params });
  return data;
}

export function getAnalyticsExportUrl({
  type,
  format = "csv",
  preset = "last_30_days",
  from,
  to,
}) {
  const params = new URLSearchParams({
    type,
    format,
    preset,
  });

  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  return `${baseUrl}/admin/analytics/export?${params.toString()}`;
}

export async function downloadAnalyticsExport({
  type,
  format = "csv",
  preset = "last_30_days",
  from,
  to,
}) {
  const params = {
    type,
    format,
    preset,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const response = await api.get("/admin/analytics/export", {
    params,
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type:
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${type}-export-${new Date().toISOString().slice(0, 10)}.${format}`,
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
