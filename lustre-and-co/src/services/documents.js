import api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export function getInvoiceHtmlUrl(orderIdentifier) {
  return `${API_BASE}/documents/invoices/order/${encodeURIComponent(orderIdentifier)}/html`;
}

export function getPackingSlipHtmlUrl(orderIdentifier) {
  return `${API_BASE}/documents/packing-slips/order/${encodeURIComponent(orderIdentifier)}/html`;
}

export function getShippingLabelHtmlUrl(orderIdentifier) {
  return `${API_BASE}/documents/shipping-labels/order/${encodeURIComponent(orderIdentifier)}/html`;
}

export function getOrderSummaryHtmlUrl(orderIdentifier) {
  return `${API_BASE}/documents/order-summaries/order/${encodeURIComponent(orderIdentifier)}/html`;
}

export function getCreditNoteHtmlUrl(returnId) {
  return `${API_BASE}/documents/credit-notes/return/${encodeURIComponent(returnId)}/html`;
}

export function getRefundReceiptHtmlUrl(returnId) {
  return `${API_BASE}/documents/refund-receipts/return/${encodeURIComponent(returnId)}/html`;
}

export function openDocumentInNewTab(url) {
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function getInvoiceData(orderIdentifier) {
  const { data } = await api.get(`/documents/invoices/order/${encodeURIComponent(orderIdentifier)}`);
  return data;
}

export async function getPackingSlipData(orderIdentifier) {
  const { data } = await api.get(`/documents/packing-slips/order/${encodeURIComponent(orderIdentifier)}`);
  return data;
}

export async function getShippingLabelData(orderIdentifier) {
  const { data } = await api.get(`/documents/shipping-labels/order/${encodeURIComponent(orderIdentifier)}`);
  return data;
}

export async function getOrderSummaryData(orderIdentifier) {
  const { data } = await api.get(`/documents/order-summaries/order/${encodeURIComponent(orderIdentifier)}`);
  return data;
}

export async function getCreditNoteData(returnId) {
  const { data } = await api.get(`/documents/credit-notes/return/${encodeURIComponent(returnId)}`);
  return data;
}

export async function getRefundReceiptData(returnId) {
  const { data } = await api.get(`/documents/refund-receipts/return/${encodeURIComponent(returnId)}`);
  return data;
}

export async function getCompanyDetails() {
  const { data } = await api.get("/documents/company-details");
  return data;
}
