import { formatPrice } from "../data/products";

export const formatAdminPrice = formatPrice;

export function formatCompactPrice(value, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export const ORDER_STATUSES = ["Confirmed", "Processing", "In Transit", "Delivered", "Cancelled"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

export function orderStatusTone(status) {
  return { Delivered: "success", Cancelled: "danger", "In Transit": "info" }[status] || "warning";
}

export function paymentTone(status) {
  return { paid: "success", refunded: "info", failed: "danger" }[status] || "warning";
}

export function paymentMethodLabel(method) {
  return { cod: "Cash on delivery", razorpay: "Online (Razorpay)" }[method] || method || "—";
}

export const linesToArray = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const arrayToLines = (list) => (list || []).join("\n");

export const csvToArray = (text) =>
  String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function initials(name) {
  return (
    String(name || "?")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
