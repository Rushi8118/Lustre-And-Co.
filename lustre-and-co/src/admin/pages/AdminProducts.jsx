import { Edit3, Eye, EyeOff, Plus, Search, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import AdminModal from "../components/AdminModal";
import { CheckboxField, EmptyState, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { arrayToLines, csvToArray, formatAdminPrice, linesToArray } from "../utils";
import { useSettings } from "../../context/SettingsContext";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const blankForm = {
  name: "",
  category: "",
  sku: "",
  price: "",
  oldPrice: "",
  stockQuantity: "",
  collectionName: "everyday",
  occasion: "everyday",
  badge: "",
  finish: "18K Gold Plated",
  material: "Gold-plated brass",
  availableColors: "Gold",
  availableSizes: "Standard",
  isNew: true,
  isBestseller: false,
  otherTags: "",
  image: "",
  gallery: "",
  description: "",
  details: "",
  care: "",
  shipping: "",
  returns: "",
  isActive: true,
  isFeatured: false
};

function toForm(product) {
  const tags = product.tags || [];
  return {
    name: product.name,
    category: product.category,
    sku: product.sku || "",
    price: product.price,
    oldPrice: product.oldPrice ?? "",
    stockQuantity: product.stockQuantity,
    collectionName: product.collectionName || "everyday",
    occasion: product.occasion || "everyday",
    badge: product.badge || "",
    finish: product.finish || "",
    material: product.material || "",
    availableColors: (product.availableColors || []).join(", "),
    availableSizes: (product.availableSizes || []).join(", "),
    isNew: tags.includes("new"),
    isBestseller: tags.includes("bestseller"),
    otherTags: tags.filter((t) => t !== "new" && t !== "bestseller").join(", "),
    image: product.image,
    gallery: arrayToLines(product.gallery),
    description: product.description || "",
    details: arrayToLines(product.details),
    care: arrayToLines(product.care),
    shipping: arrayToLines(product.shipping),
    returns: arrayToLines(product.returns),
    isActive: product.isActive !== false,
    isFeatured: Boolean(product.isFeatured)
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    category: form.category,
    sku: form.sku.trim() || undefined,
    price: Number(form.price),
    oldPrice: form.oldPrice === "" ? null : Number(form.oldPrice),
    stockQuantity: Number(form.stockQuantity),
    collectionName: form.collectionName.trim() || "everyday",
    occasion: form.occasion,
    badge: form.badge.trim(),
    finish: form.finish.trim(),
    material: form.material.trim(),
    availableColors: csvToArray(form.availableColors),
    availableSizes: csvToArray(form.availableSizes),
    tags: [...(form.isNew ? ["new"] : []), ...(form.isBestseller ? ["bestseller"] : []), ...csvToArray(form.otherTags)],
    image: form.image.trim(),
    gallery: linesToArray(form.gallery),
    description: form.description.trim(),
    details: linesToArray(form.details),
    care: linesToArray(form.care),
    shipping: linesToArray(form.shipping),
    returns: linesToArray(form.returns),
    isActive: form.isActive,
    isFeatured: form.isFeatured
  };
}

export default function AdminProducts() {
  const { commerce, reload: reloadSettings } = useSettings();
  const { showToast, refreshProducts } = useStore();
  const { refreshAttention } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState(searchParams.get("stock") === "low" ? "low" : "all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsRes, categoriesRes] = await Promise.all([api.get("/admin/products"), api.get("/admin/categories")]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      setError(getErrorMessage(err, "Products could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && categories.length) {
      openCreate();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories.length]);

  const stockStatus = (p) =>
    p.isActive === false
      ? { label: "Hidden", tone: "info" }
      : p.stockQuantity === 0
        ? { label: "Out of stock", tone: "danger" }
        : p.stockQuantity <= commerce.lowStockThreshold
          ? { label: "Low stock", tone: "warning" }
          : { label: "Active", tone: "success" };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchesQuery = !q || `${p.name} ${p.sku || ""} ${p.slug}`.toLowerCase().includes(q);
      const matchesCategory = category === "all" || p.category === category;
      const matchesStatus =
        status === "all" ||
        (status === "hidden" && p.isActive === false) ||
        (status === "active" && p.isActive !== false) ||
        (status === "low" && p.stockQuantity <= commerce.lowStockThreshold);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [products, query, category, status, commerce.lowStockThreshold]);

  function openCreate() {
    setEditing(null);
    setForm({ ...blankForm, category: categories[0]?.slug || "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm(toForm(product));
    setFormError("");
    setModalOpen(true);
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setBool = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  async function afterChange() {
    await load();
    refreshProducts();
    refreshAttention();
    reloadSettings();
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = toPayload(form);
      if (editing) {
        await api.put(`/admin/products/${editing._id}`, payload);
        showToast(`“${payload.name}” updated.`, "success");
      } else {
        await api.post("/admin/products", payload);
        showToast(`“${payload.name}” created.`, "success");
      }
      setModalOpen(false);
      await afterChange();
    } catch (err) {
      setFormError(getErrorMessage(err, "The product could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(product) {
    try {
      await api.put(`/admin/products/${product._id}`, { isActive: product.isActive === false });
      showToast(product.isActive === false ? "Product is now visible in the store." : "Product hidden from the store.", "success");
      await afterChange();
    } catch (err) {
      showToast(getErrorMessage(err, "Visibility could not be changed."), "error");
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? Its reviews are deleted too. Past orders keep their snapshot.`)) return;
    try {
      const { data } = await api.delete(`/admin/products/${product._id}`);
      showToast(data.message, "success");
      await afterChange();
    } catch (err) {
      showToast(getErrorMessage(err, "The product could not be deleted."), "error");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Catalog</span>
          <h1>Products</h1>
          <p>Manage pieces, pricing, inventory, and storefront visibility.</p>
        </div>

        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>
          <button className="admin-button admin-button-dark" onClick={openCreate} disabled={!categories.length}>
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-table-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, or slug…" />
          </div>

          <div className="admin-toolbar-group">
            <select className="admin-select" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Visible</option>
              <option value="hidden">Hidden</option>
              <option value="low">Low stock (≤ {commerce.lowStockThreshold})</option>
            </select>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !products.length && <LoadingState label="Loading products…" />}
        {!loading && !error && categories.length === 0 && (
          <EmptyState title="Create a category first">
            Products belong to a category. <Link to="/admin/categories">Add a category</Link> to get started.
          </EmptyState>
        )}

        {!error && products.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table product-admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const badge = stockStatus(product);
                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="admin-product-cell">
                          <img src={product.image} alt={product.name} />
                          <div>
                            <strong>{product.name}</strong>
                            <small>
                              {product.badge ? `${product.badge} · ` : ""}
                              {product.isFeatured ? "Featured · " : ""}
                              {(product.tags || []).join(", ") || "No tags"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{product.sku || "—"}</code>
                      </td>
                      <td>{categories.find((c) => c.slug === product.category)?.name || product.category}</td>
                      <td>
                        <strong>{formatAdminPrice(product.price)}</strong>
                        {product.oldPrice > product.price && (
                          <small className="admin-table-subtext">
                            <del>{formatAdminPrice(product.oldPrice)}</del>
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{product.stockQuantity}</strong> units
                      </td>
                      <td>{product.salesCount || 0}</td>
                      <td>{product.reviews ? `${product.rating} (${product.reviews})` : "—"}</td>
                      <td>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          {product.isActive !== false && (
                            <a className="admin-action-button" href={`/product/${product.slug}`} target="_blank" rel="noreferrer" title="View in store">
                              <ExternalLink size={15} />
                            </a>
                          )}
                          <button className="admin-action-button" onClick={() => toggleVisibility(product)} title={product.isActive === false ? "Show in store" : "Hide from store"}>
                            {product.isActive === false ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>
                          <button className="admin-action-button" onClick={() => openEdit(product)} title="Edit product">
                            <Edit3 size={15} />
                          </button>
                          <button className="admin-action-button danger" onClick={() => removeProduct(product)} title="Delete product">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="admin-table-empty">
                      No products match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit product" : "New product"}
        description="Changes apply to the storefront immediately after saving."
        wide
      >
        <form onSubmit={saveProduct} className="admin-form-grid">
          <span className="admin-form-section-title">Basics</span>
          <Field label="Product name">
            <input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={set("category")} required>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU" hint="Generated automatically if left blank">
            <input value={form.sku} onChange={set("sku")} />
          </Field>
          <Field label="Badge" hint="e.g. New, Bestseller, Sale — leave blank for none">
            <input value={form.badge} onChange={set("badge")} />
          </Field>

          <span className="admin-form-section-title">Pricing & inventory</span>
          <Field label="Price">
            <input type="number" min="0" value={form.price} onChange={set("price")} required />
          </Field>
          <Field label="Compare-at price" hint="Shown struck through; leave blank for none">
            <input type="number" min="0" value={form.oldPrice} onChange={set("oldPrice")} />
          </Field>
          <Field label="Stock quantity">
            <input type="number" min="0" value={form.stockQuantity} onChange={set("stockQuantity")} required />
          </Field>
          <Field label="Occasion">
            <select value={form.occasion} onChange={set("occasion")}>
              <option value="everyday">Everyday</option>
              <option value="bridal">Bridal</option>
              <option value="party">Party</option>
              <option value="festive">Festive</option>
            </select>
          </Field>

          <span className="admin-form-section-title">Attributes</span>
          <Field label="Collection">
            <input value={form.collectionName} onChange={set("collectionName")} />
          </Field>
          <Field label="Finish">
            <input value={form.finish} onChange={set("finish")} />
          </Field>
          <Field label="Material">
            <input value={form.material} onChange={set("material")} />
          </Field>
          <Field label="Colors" hint="Comma-separated, e.g. Gold, Rose gold, Silver">
            <input value={form.availableColors} onChange={set("availableColors")} />
          </Field>
          <Field label="Sizes" hint="Comma-separated">
            <input value={form.availableSizes} onChange={set("availableSizes")} />
          </Field>
          <Field label="Other tags" hint="Comma-separated, e.g. bridal, festive">
            <input value={form.otherTags} onChange={set("otherTags")} />
          </Field>
          <CheckboxField label="Show in New Arrivals" checked={form.isNew} onChange={setBool("isNew")} />
          <CheckboxField label="Show in Best Sellers" checked={form.isBestseller} onChange={setBool("isBestseller")} />
          <CheckboxField label="Visible in store" checked={form.isActive} onChange={setBool("isActive")} />
          <CheckboxField label="Featured (ranked first in Recommended)" checked={form.isFeatured} onChange={setBool("isFeatured")} />

          <span className="admin-form-section-title">Media</span>
          <Field label="Main image URL" full>
            <input value={form.image} onChange={set("image")} required placeholder="https://…" />
          </Field>
          <Field label="Gallery image URLs" hint="One per line; the main image is used if empty" full>
            <textarea value={form.gallery} onChange={set("gallery")} />
          </Field>

          <span className="admin-form-section-title">Content</span>
          <Field label="Description" full>
            <textarea value={form.description} onChange={set("description")} />
          </Field>
          <Field label="Product details" hint="One bullet per line">
            <textarea value={form.details} onChange={set("details")} />
          </Field>
          <Field label="Care instructions" hint="One bullet per line">
            <textarea value={form.care} onChange={set("care")} />
          </Field>
          <Field label="Shipping notes" hint="Optional; store defaults are used when empty">
            <textarea value={form.shipping} onChange={set("shipping")} />
          </Field>
          <Field label="Return notes" hint="Optional; store defaults are used when empty">
            <textarea value={form.returns} onChange={set("returns")} />
          </Field>

          <FormError message={formError} />

          <div className="admin-modal-actions">
            <button type="button" className="admin-button admin-button-light" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
