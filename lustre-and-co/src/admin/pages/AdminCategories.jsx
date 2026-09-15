import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminModal from "../components/AdminModal";
import AdminTable from "../components/AdminTable";
import { CheckboxField, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { useSettings } from "../../context/SettingsContext";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const blank = {
  name: "",
  slug: "",
  eyebrow: "",
  title: "",
  description: "",
  image: "",
  sortOrder: 0,
  isActive: true,
  showInMenu: true,
  showOnHome: true
};

export default function AdminCategories() {
  const { reload: reloadSettings } = useSettings();
  const { showToast } = useStore();
  const [categories, setCategories] = useState([]);
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
      const { data } = await api.get("/admin/categories");
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err, "Categories could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openModal(category = null) {
    setEditing(category);
    setForm(category ? { ...blank, ...category } : { ...blank, sortOrder: categories.length + 1 });
    setFormError("");
    setModalOpen(true);
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setBool = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      eyebrow: form.eyebrow,
      title: form.title,
      description: form.description,
      image: form.image.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
      showInMenu: form.showInMenu,
      showOnHome: form.showOnHome
    };
    try {
      if (editing) await api.put(`/admin/categories/${editing._id}`, payload);
      else await api.post("/admin/categories", payload);
      showToast(`Category “${payload.name}” saved.`, "success");
      setModalOpen(false);
      await load();
      reloadSettings();
    } catch (err) {
      setFormError(getErrorMessage(err, "The category could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    try {
      await api.delete(`/admin/categories/${category._id}`);
      showToast("Category deleted.", "success");
      await load();
      reloadSettings();
    } catch (err) {
      showToast(getErrorMessage(err, "The category could not be deleted."), "error");
    }
  }

  const columns = [
    {
      key: "name",
      label: "Category",
      render: (row) => (
        <div className="admin-product-cell">
          {row.image ? <img src={row.image} alt={row.name} /> : <span className="customer-initial">{row.name[0]}</span>}
          <div>
            <strong>{row.name}</strong>
            <small>/category/{row.slug}</small>
          </div>
        </div>
      )
    },
    { key: "productCount", label: "Products", render: (row) => <strong>{row.productCount}</strong> },
    { key: "sortOrder", label: "Order", render: (row) => row.sortOrder },
    {
      key: "placement",
      label: "Shown in",
      render: (row) => [row.showInMenu && "Menu", row.showOnHome && "Homepage"].filter(Boolean).join(", ") || "—"
    },
    {
      key: "isActive",
      label: "Status",
      render: (row) => <StatusBadge tone={row.isActive ? "success" : "info"}>{row.isActive ? "Active" : "Hidden"}</StatusBadge>
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="admin-row-actions">
          <button className="admin-action-button" onClick={() => openModal(row)} title="Edit">
            <Edit3 size={15} />
          </button>
          <button className="admin-action-button danger" onClick={() => remove(row)} title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Catalog</span>
          <h1>Categories</h1>
          <p>Control the categories shown in navigation, on the homepage, and in catalog filters.</p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button type="button" className="admin-button admin-button-dark" onClick={() => openModal()}>
            <Plus size={16} /> Add category
          </button>
        </div>
      </div>

      <section className="admin-panel">
        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !categories.length ? (
          <LoadingState />
        ) : (
          <AdminTable columns={columns} rows={categories.map((c) => ({ ...c, id: c._id }))} emptyMessage="No categories yet." />
        )}
      </section>

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit category" : "New category"}>
        <form onSubmit={save} className="admin-form-grid">
          <Field label="Name">
            <input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="URL slug" hint="Lowercase letters, numbers, hyphens. Blank = from name.">
            <input value={form.slug} onChange={set("slug")} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          <Field label="Page eyebrow">
            <input value={form.eyebrow} onChange={set("eyebrow")} />
          </Field>
          <Field label="Page title">
            <input value={form.title} onChange={set("title")} />
          </Field>
          <Field label="Description" full>
            <textarea value={form.description} onChange={set("description")} />
          </Field>
          <Field label="Image URL" full>
            <input value={form.image} onChange={set("image")} placeholder="https://…" />
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sortOrder} onChange={set("sortOrder")} />
          </Field>
          <span />
          <CheckboxField label="Active" checked={form.isActive} onChange={setBool("isActive")} />
          <CheckboxField label="Show in navigation menu" checked={form.showInMenu} onChange={setBool("showInMenu")} />
          <CheckboxField label="Show on homepage" checked={form.showOnHome} onChange={setBool("showOnHome")} />
          <FormError message={formError} />
          <div className="admin-modal-actions">
            <button type="button" className="admin-button admin-button-light" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
              {saving ? "Saving…" : "Save category"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
