import { Edit3, Plus, Tag, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminModal from "../components/AdminModal";
import { CheckboxField, EmptyState, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { formatAdminPrice, formatDate } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const blank = {
  code: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  usageLimit: "",
  expiresAt: "",
  description: "",
  isActive: true
};

function couponState(coupon) {
  if (!coupon.isActive) return { label: "Inactive", tone: "info" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { label: "Expired", tone: "danger" };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { label: "Limit reached", tone: "danger" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) - Date.now() < 7 * 86400000) return { label: "Expiring soon", tone: "warning" };
  return { label: "Active", tone: "success" };
}

function valueLabel(coupon) {
  if (coupon.type === "percentage") return `${Math.round(coupon.value * 100)}% off`;
  if (coupon.type === "fixed") return `${formatAdminPrice(coupon.value)} off`;
  return "Free shipping";
}

export default function AdminDiscounts() {
  const { showToast } = useStore();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/discounts");
      setCoupons(data);
    } catch (err) {
      setError(getErrorMessage(err, "Discounts could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openModal(coupon = null) {
    setEditing(coupon);
    setForm(
      coupon
        ? {
            code: coupon.code,
            type: coupon.type,
            value: coupon.type === "percentage" ? Math.round(coupon.value * 100) : coupon.value,
            minOrderAmount: coupon.minOrderAmount || "",
            usageLimit: coupon.usageLimit || "",
            expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
            description: coupon.description || "",
            isActive: coupon.isActive
          }
        : blank
    );
    setFormError("");
    setModalOpen(true);
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const numericValue = Number(form.value || 0);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: form.type === "percentage" ? numericValue / 100 : form.type === "fixed" ? numericValue : 0,
      minOrderAmount: Number(form.minOrderAmount || 0),
      usageLimit: Number(form.usageLimit || 0),
      description: form.description.trim(),
      isActive: form.isActive,
      expiresAt: form.expiresAt ? form.expiresAt : editing ? null : undefined
    };
    if (form.type === "percentage" && (numericValue <= 0 || numericValue > 100)) {
      setFormError("Percentage must be between 1 and 100.");
      setSaving(false);
      return;
    }
    try {
      if (editing) await api.put(`/admin/discounts/${editing._id}`, payload);
      else await api.post("/admin/discounts", payload);
      showToast(`Coupon ${payload.code} saved.`, "success");
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err, "The coupon could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon) {
    try {
      await api.put(`/admin/discounts/${coupon._id}`, { isActive: !coupon.isActive });
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "Could not update the coupon."), "error");
    }
  }

  async function remove(coupon) {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await api.delete(`/admin/discounts/${coupon._id}`);
      showToast(`Coupon ${coupon.code} deleted.`, "success");
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "The coupon could not be deleted."), "error");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Sales</span>
          <h1>Discounts</h1>
          <p>Create promo codes with minimum spend, usage limits, and expiry dates.</p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button className="admin-button admin-button-dark" onClick={() => openModal()}>
            <Plus size={16} /> Create discount
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !coupons.length && <LoadingState />}
      {!loading && !error && coupons.length === 0 && <EmptyState title="No promo codes yet">Create your first discount code.</EmptyState>}

      <div className="admin-discount-grid">
        {coupons.map((coupon) => {
          const state = couponState(coupon);
          return (
            <article className={`admin-discount-card ${coupon.isActive ? "" : "is-inactive"}`} key={coupon._id}>
              <div className="discount-card-top">
                <div className="discount-icon">
                  <Tag size={18} />
                </div>
                <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
              </div>

              <strong className="discount-code">{coupon.code}</strong>
              <span className="discount-value">{valueLabel(coupon)}</span>
              {coupon.description && <small className="admin-muted">{coupon.description}</small>}

              <div className="discount-card-details">
                <span>
                  Min spend
                  <b>{coupon.minOrderAmount ? formatAdminPrice(coupon.minOrderAmount) : "None"}</b>
                </span>
                <span>
                  Used
                  <b>
                    {coupon.usedCount || 0} / {coupon.usageLimit || "∞"}
                  </b>
                </span>
                <span>
                  Expires
                  <b>{coupon.expiresAt ? formatDate(coupon.expiresAt) : "Never"}</b>
                </span>
              </div>

              <div className="discount-card-actions">
                <button className="admin-action-button" onClick={() => openModal(coupon)}>
                  <Edit3 size={15} /> Edit
                </button>
                <button className="admin-action-button" onClick={() => toggleActive(coupon)}>
                  {coupon.isActive ? "Deactivate" : "Activate"}
                </button>
                <button className="admin-action-button danger" onClick={() => remove(coupon)} title="Delete discount">
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit discount" : "Create discount"} description="Customers enter this code in their bag or at checkout.">
        <form className="admin-form-grid" onSubmit={save}>
          <Field label="Code" hint="Letters, numbers, - and _">
            <input value={form.code} onChange={set("code")} required pattern="[A-Za-z0-9_\-]+" placeholder="FESTIVE20" />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={set("type")}>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </Field>
          {form.type !== "free_shipping" && (
            <Field label={form.type === "percentage" ? "Percent off" : "Amount off"}>
              <input type="number" min="1" max={form.type === "percentage" ? 100 : undefined} value={form.value} onChange={set("value")} required />
            </Field>
          )}
          <Field label="Minimum subtotal" hint="0 or blank for no minimum">
            <input type="number" min="0" value={form.minOrderAmount} onChange={set("minOrderAmount")} />
          </Field>
          <Field label="Usage limit" hint="Total redemptions; blank for unlimited">
            <input type="number" min="0" value={form.usageLimit} onChange={set("usageLimit")} />
          </Field>
          <Field label="Expiry date" hint="Blank for no expiry">
            <input type="date" value={form.expiresAt} onChange={set("expiresAt")} />
          </Field>
          <Field label="Internal description" full>
            <input value={form.description} onChange={set("description")} />
          </Field>
          <CheckboxField label="Active" checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} />
          <FormError message={formError} />
          <div className="admin-modal-actions">
            <button type="button" className="admin-button admin-button-light" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
              {saving ? "Saving…" : "Save discount"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
