import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  Gift,
  Tag,
  Check,
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  Search,
  X,
} from "lucide-react";
import AdminModal from "../components/AdminModal";
import AdminDropdown from "../components/AdminDropdown";
import {
  CheckboxField,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  LoadingState,
  StatusBadge,
} from "../components/AdminUi";
import { formatAdminPrice, formatDate } from "../utils";
import { useStore } from "../../context/StoreContext";
import {
  getAdminBundles,
  createBundle,
  updateBundle,
  deleteBundle,
} from "../../services/bundles";

const BUNDLE_TYPES = [
  { value: "fixed_bundle", label: "Fixed Bundle" },
  { value: "gift_set", label: "Gift Set" },
  { value: "starter_kit", label: "Starter Kit" },
  { value: "frequently_bought_together", label: "Frequently Bought Together" },
  { value: "mix_and_match", label: "Mix & Match" },
  { value: "bogo", label: "Buy-One-Get-One (BOGO)" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage Discount (%)" },
  { value: "fixed", label: "Fixed Amount Off (₹)" },
  { value: "free_item", label: "Free Item (BOGO)" },
];

const blankForm = {
  name: "",
  slug: "",
  description: "",
  bundleType: "fixed_bundle",
  discountType: "percentage",
  discountValue: 10,
  minItems: 2,
  maxItems: "",
  buyQuantity: 1,
  getQuantity: 1,
  isActive: true,
  isFeatured: false,
  startsAt: "",
  endsAt: "",
  image: "",
  items: [],
};

export default function AdminBundles() {
  const { products, showToast } = useStore();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.slug && b.slug.toLowerCase().includes(q));
      const matchType = typeFilter === "all" || b.bundleType === typeFilter;
      return matchSearch && matchType;
    });
  }, [bundles, search, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminBundles();
      setBundles(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Bundles could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      ...blankForm,
      items: products.slice(0, 2).map((p, idx) => ({
        productId: p.id,
        quantity: 1,
        isRequired: true,
        sortOrder: idx,
      })),
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (bundle) => {
    setEditing(bundle);
    setForm({
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description || "",
      bundleType: bundle.bundleType,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue,
      minItems: bundle.minItems || 2,
      maxItems: bundle.maxItems ?? "",
      buyQuantity: bundle.buyQuantity ?? 1,
      getQuantity: bundle.getQuantity ?? 1,
      isActive: bundle.isActive,
      isFeatured: bundle.isFeatured,
      startsAt: bundle.startsAt ? bundle.startsAt.substring(0, 10) : "",
      endsAt: bundle.endsAt ? bundle.endsAt.substring(0, 10) : "",
      image: bundle.image || "",
      items: (bundle.items || []).map((it, idx) => ({
        productId: it.productId,
        quantity: it.quantity || 1,
        isRequired: it.isRequired ?? true,
        sortOrder: it.sortOrder ?? idx,
      })),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      name: val,
      slug: editing
        ? prev.slug
        : val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  const toggleItemProduct = (productId) => {
    setForm((prev) => {
      const exists = prev.items.some((it) => it.productId === productId);
      if (exists) {
        return {
          ...prev,
          items: prev.items.filter((it) => it.productId !== productId),
        };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            productId,
            quantity: 1,
            isRequired: true,
            sortOrder: prev.items.length,
          },
        ],
      };
    });
  };

  const updateItemQty = (productId, qty) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.productId === productId
          ? { ...it, quantity: Math.max(1, Number(qty) || 1) }
          : it,
      ),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Bundle name and slug are required.");
      return;
    }
    if (!form.items.length) {
      setFormError("Please select at least one product for this bundle.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim() || undefined,
      bundleType: form.bundleType,
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      minItems: Number(form.minItems || 1),
      maxItems: form.maxItems ? Number(form.maxItems) : undefined,
      buyQuantity:
        form.bundleType === "bogo" ? Number(form.buyQuantity || 1) : undefined,
      getQuantity:
        form.bundleType === "bogo" ? Number(form.getQuantity || 1) : undefined,
      isActive: Boolean(form.isActive),
      isFeatured: Boolean(form.isFeatured),
      startsAt: form.startsAt
        ? new Date(form.startsAt).toISOString()
        : undefined,
      endsAt: form.endsAt
        ? new Date(form.endsAt).toISOString()
        : undefined,
      image: form.image.trim() || undefined,
      items: form.items.map((it, idx) => ({
        productId: it.productId,
        quantity: Number(it.quantity || 1),
        isRequired: Boolean(it.isRequired),
        sortOrder: idx,
      })),
    };

    try {
      if (editing) {
        await updateBundle(editing.id, payload);
        showToast("Bundle updated successfully.", "success");
      } else {
        await createBundle(payload);
        showToast("Bundle created successfully.", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to save product bundle.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (bundle) => {
    if (!window.confirm(`Delete bundle "${bundle.name}"?`)) return;
    try {
      await deleteBundle(bundle.id);
      showToast("Bundle deleted.", "success");
      load();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Could not delete bundle.",
        "error",
      );
    }
  };

  const discountBadgeText = (b) => {
    if (b.discountType === "percentage") return `${b.discountValue}% off`;
    if (b.discountType === "fixed") return `${formatAdminPrice(b.discountValue)} off`;
    if (b.discountType === "free_item")
      return `Buy ${b.buyQuantity || 1} Get ${b.getQuantity || 1} Free`;
    return "No discount";
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Inventory & Packaging</span>
          <h1 className="admin-page-title">Product Bundles & Sets</h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="admin-button admin-button-primary"
        >
          <Plus size={16} /> New Bundle
        </button>
      </div>

      {loading && <LoadingState message="Loading bundles…" />}
      {error && !loading && <ErrorState message={error} retry={load} />}

      {!loading && !error && bundles.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No bundles created yet"
          message="Create your first package, gift set, or buy-one-get-one offer to increase average order value."
          action={
            <button
              type="button"
              onClick={openNew}
              className="admin-button admin-button-primary"
            >
              <Plus size={16} /> Create Bundle
            </button>
          }
        />
      )}

      {!loading && !error && bundles.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-toolbar" style={{ padding: "16px 20px 0 20px" }}>
            <div className="admin-table-search">
              <Search size={16} />
              <input
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bundle name or slug…"
              />
              {search && (
                <button
                  type="button"
                  className="admin-table-search-clear"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="admin-toolbar-group">
              <AdminDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All bundle types" },
                  ...BUNDLE_TYPES,
                ]}
                ariaLabel="Filter by bundle type"
              />
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Bundle Name</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Items Included</th>
                <th>Status</th>
                <th>Dates</th>
                <th className="admin-table-align-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBundles.map((bundle) => (
                <tr key={bundle.id}>
                  <td>
                    <div className="admin-product-cell">
                      {bundle.image ? (
                        <img
                          src={bundle.image}
                          alt={bundle.name}
                          className="admin-product-thumb"
                        />
                      ) : (
                        <div className="admin-product-thumb-placeholder">
                          <Package size={16} />
                        </div>
                      )}
                      <div>
                        <strong>{bundle.name}</strong>
                        <div className="admin-subtext">/{bundle.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-category-pill">
                      {bundle.bundleType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "var(--admin-green, #276749)" }}>
                      {discountBadgeText(bundle)}
                    </strong>
                  </td>
                  <td>
                    <span>
                      {bundle.items?.length || 0} product(s)
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      label={bundle.isActive ? "Active" : "Draft"}
                      tone={bundle.isActive ? "success" : "neutral"}
                    />
                  </td>
                  <td>
                    <span className="admin-subtext">
                      {bundle.startsAt ? formatDate(bundle.startsAt) : "Now"} –{" "}
                      {bundle.endsAt ? formatDate(bundle.endsAt) : "Indefinite"}
                    </span>
                  </td>
                  <td className="admin-table-align-right">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => openEdit(bundle)}
                        className="admin-action-button"
                        title="Edit bundle"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(bundle)}
                        className="admin-action-button danger"
                        title="Delete bundle"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBundles.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    No bundles match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <AdminModal
          title={editing ? `Edit Bundle: ${editing.name}` : "Create New Bundle"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={save} className="admin-form">
            <FormError message={formError} />

            <div className="admin-form-grid-2">
              <Field label="Bundle Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Everyday Shine Set"
                  required
                />
              </Field>

              <Field label="URL Slug" required>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="everyday-shine-set"
                  required
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="A necklace and matching earrings with 15% automatic bundle discount."
              />
            </Field>

            <div className="admin-form-grid-2">
              <Field label="Bundle Type" required>
                <select
                  value={form.bundleType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      bundleType: nextType,
                      discountType:
                        nextType === "bogo" ? "free_item" : prev.discountType,
                    }));
                  }}
                >
                  {BUNDLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Discount Type" required>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discountType: e.target.value }))
                  }
                >
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {form.bundleType === "bogo" ? (
              <div className="admin-form-grid-2">
                <Field label="Buy Quantity" required>
                  <input
                    type="number"
                    min={1}
                    value={form.buyQuantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        buyQuantity: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </Field>

                <Field label="Get Free Quantity" required>
                  <input
                    type="number"
                    min={1}
                    value={form.getQuantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        getQuantity: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </Field>
              </div>
            ) : (
              <div className="admin-form-grid-2">
                <Field
                  label={
                    form.discountType === "percentage"
                      ? "Discount Value (%)"
                      : "Discount Amount (₹)"
                  }
                  required
                >
                  <input
                    type="number"
                    min={0}
                    max={form.discountType === "percentage" ? 100 : 1000000}
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountValue: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                </Field>

                <Field label="Min Items in Bundle">
                  <input
                    type="number"
                    min={1}
                    value={form.minItems}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minItems: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </Field>
              </div>
            )}

            {form.bundleType === "mix_and_match" && (
              <div className="admin-form-grid-2">
                <Field label="Max Items (optional)">
                  <input
                    type="number"
                    min={form.minItems}
                    value={form.maxItems}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxItems: e.target.value ? Number(e.target.value) : "",
                      }))
                    }
                    placeholder="Leave blank for unlimited"
                  />
                </Field>
              </div>
            )}

            <div className="admin-form-grid-2">
              <Field label="Starts At (optional)">
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                />
              </Field>

              <Field label="Ends At (optional)">
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Custom Cover Image URL (optional)">
              <input
                type="url"
                value={form.image}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, image: e.target.value }))
                }
                placeholder="https://..."
              />
            </Field>

            {/* Product items selector */}
            <div className="admin-bundle-products-selector">
              <label className="admin-field-label">
                Select Bundle Products ({form.items.length} chosen)
              </label>
              <div className="admin-bundle-products-list">
                {products.map((p) => {
                  const selectedItem = form.items.find(
                    (it) => it.productId === p.id,
                  );
                  const isSelected = Boolean(selectedItem);

                  return (
                    <div
                      key={p.id}
                      className={`admin-bundle-picker-row ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <label className="admin-bundle-picker-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemProduct(p.id)}
                        />
                        {p.image && (
                          <img
                            src={p.image}
                            alt=""
                            className="admin-product-thumb"
                          />
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          <span className="admin-subtext">
                            {formatAdminPrice(p.price)} • Stock:{" "}
                            {p.stockQuantity ?? 0}
                          </span>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="admin-bundle-item-qty-input">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min={1}
                            value={selectedItem.quantity}
                            onChange={(e) =>
                              updateItemQty(p.id, e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-checkbox-row">
              <CheckboxField
                label="Bundle is Active (visible to customers)"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <CheckboxField
                label="Featured on Homepage"
                checked={form.isFeatured}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))
                }
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="admin-button admin-button-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="admin-button admin-button-primary"
              >
                {saving ? "Saving…" : editing ? "Update Bundle" : "Create Bundle"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
