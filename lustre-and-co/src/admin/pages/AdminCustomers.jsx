import { Eye, Search, UserPlus, RefreshCw, UserX, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminTable from "../components/AdminTable";
import AdminModal from "../components/AdminModal";
import { CheckboxField, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { formatAdminPrice, formatDate, formatDateTime, orderStatusTone } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

function CustomerDetail({ customerId, currentAdminId, onClose, onChanged }) {
  const { showToast } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isSelf = customerId === currentAdminId;

  const load = useCallback(async () => {
    try {
      const { data: response } = await api.get(`/admin/customers/${customerId}`);
      setData(response);
      setForm({
        name: response.user.name,
        phone: response.user.phone || "",
        role: response.user.role,
        isActive: response.user.isActive !== false
      });
    } catch (err) {
      setError(getErrorMessage(err, "Customer could not be loaded."));
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api.patch(`/admin/customers/${customerId}`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        isActive: form.isActive,
        ...(newPassword ? { password: newPassword } : {})
      });
      showToast("Account updated.", "success");
      setNewPassword("");
      await load();
      onChanged();
    } catch (err) {
      setFormError(getErrorMessage(err, "The account could not be updated."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Permanently delete ${data.user.email}? Their orders are kept.`)) return;
    try {
      const { data: response } = await api.delete(`/admin/customers/${customerId}`);
      showToast(response.message, "success");
      onChanged();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "The account could not be deleted."));
    }
  }

  const user = data?.user;

  return (
    <AdminModal open onClose={onClose} title={user?.name || "Customer"} description={user?.email} wide>
      {error && <ErrorState message={error} onRetry={load} />}
      {!user && !error && <LoadingState />}

      {user && form && (
        <div className="admin-detail-grid">
          <div className="admin-detail-card">
            <h3>Account</h3>
            <dl className="admin-kv">
              <dt>Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
              <dt>Last sign-in</dt>
              <dd>{formatDateTime(user.lastLoginAt)}</dd>
              <dt>Orders</dt>
              <dd>{data.orders.length}</dd>
              <dt>Wishlist</dt>
              <dd>{user.wishlist?.length || 0} pieces</dd>
            </dl>
          </div>

          <div className="admin-detail-card">
            <h3>Saved addresses</h3>
            {user.addresses?.length ? (
              user.addresses.map((addr) => (
                <p key={addr._id}>
                  {addr.isDefault && <StatusBadge tone="success">Default</StatusBadge>} {addr.fullName}, {addr.address}, {addr.city}{" "}
                  {addr.postalCode} · {addr.phone}
                </p>
              ))
            ) : (
              <p className="admin-muted">No saved addresses.</p>
            )}
          </div>

          <div className="admin-detail-card full">
            <h3>Edit account</h3>
            <form className="admin-form-grid" onSubmit={save}>
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Role" hint={isSelf ? "You cannot change your own role." : undefined}>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={isSelf}>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Set a new password" hint="Leave blank to keep the current password (min 8 characters)">
                <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <CheckboxField
                label="Account active (inactive accounts cannot sign in)"
                checked={form.isActive}
                onChange={(value) => setForm({ ...form, isActive: value })}
                disabled={isSelf}
                full
              />
              <FormError message={formError} />
              <div className="admin-modal-actions">
                {!isSelf && (
                  <button type="button" className="admin-button admin-button-danger" onClick={remove}>
                    Delete account
                  </button>
                )}
                <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-detail-card full">
            <h3>Orders</h3>
            {data.orders.length === 0 ? (
              <p className="admin-muted">No orders yet.</p>
            ) : (
              <div className="admin-line-items">
                {data.orders.map((order) => (
                  <div className="admin-card-row" key={order._id}>
                    <Link to={`/admin/orders?search=${order.orderId}`} onClick={onClose}>
                      #{order.orderId}
                    </Link>
                    <span className="admin-muted">{formatDate(order.createdAt)}</span>
                    <strong>{formatAdminPrice(order.total)}</strong>
                    <StatusBadge tone={orderStatusTone(order.status)}>{order.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminModal>
  );
}

export default function AdminCustomers() {
  const { user: currentAdmin, showToast } = useStore();
  const [filters, setFilters] = useState({ search: "", role: "all", status: "all" });
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({ customers: [], summary: null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", password: "", role: "customer" });
  const [createError, setCreateError] = useState("");

  const currentAdminId = currentAdmin?._id || currentAdmin?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/customers", { params: { ...filters, search: filters.search || undefined, limit: 200 } });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Customers could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(row) {
    try {
      await api.patch(`/admin/customers/${row._id}`, { isActive: row.isActive === false });
      showToast(row.isActive === false ? "Account reactivated." : "Account deactivated.", "success");
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "Status could not be changed."), "error");
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setCreateError("");
    try {
      await api.post("/admin/customers", { ...createForm, phone: createForm.phone || undefined });
      showToast("Account created.", "success");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", phone: "", password: "", role: "customer" });
      load();
    } catch (err) {
      setCreateError(getErrorMessage(err, "The account could not be created."));
    }
  }

  const summary = data.summary;

  const columns = [
    {
      key: "name",
      label: "Customer",
      render: (row) => (
        <div className="admin-customer-cell">
          <span className="customer-initial customer-initial-large">{row.name.slice(0, 1)}</span>
          <div>
            <button type="button" className="admin-link-button" onClick={() => setOpenId(row._id)}>
              {row.name}
            </button>
            <small>{row.email}</small>
          </div>
        </div>
      )
    },
    { key: "role", label: "Role", render: (row) => <StatusBadge tone={row.role === "admin" ? "info" : "success"}>{row.role}</StatusBadge> },
    { key: "orders", label: "Orders", render: (row) => <strong>{row.orders}</strong> },
    { key: "spent", label: "Total spent", render: (row) => <strong>{formatAdminPrice(row.spent)}</strong> },
    { key: "createdAt", label: "Joined", render: (row) => formatDate(row.createdAt) },
    { key: "lastLoginAt", label: "Last sign-in", render: (row) => formatDate(row.lastLoginAt) },
    {
      key: "isActive",
      label: "Status",
      render: (row) => <StatusBadge tone={row.isActive === false ? "danger" : "success"}>{row.isActive === false ? "Inactive" : "Active"}</StatusBadge>
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="admin-row-actions">
          <button className="admin-action-button" onClick={() => setOpenId(row._id)} title="View details">
            <Eye size={15} />
          </button>
          {row._id !== currentAdminId && (
            <button className="admin-action-button" onClick={() => toggleActive(row)} title={row.isActive === false ? "Reactivate" : "Deactivate"}>
              {row.isActive === false ? <UserCheck size={15} /> : <UserX size={15} />}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Customers</span>
          <h1>Customers &amp; accounts</h1>
          <p>View customer history, manage access, and create staff accounts.</p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button className="admin-button admin-button-dark" onClick={() => setCreateOpen(true)}>
            <UserPlus size={16} /> Add account
          </button>
        </div>
      </div>

      {summary && (
        <div className="admin-mini-stats">
          <div>
            <span>Total customers</span>
            <strong>{summary.totalCustomers}</strong>
            <small>{summary.newThisMonth} joined this month</small>
          </div>
          <div>
            <span>Returning customers</span>
            <strong>{summary.returningRate}%</strong>
            <small>of customers with an order bought again</small>
          </div>
          <div>
            <span>Average order value</span>
            <strong>{formatAdminPrice(summary.averageOrderValue)}</strong>
            <small>registered customers, excl. cancelled</small>
          </div>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <form
            className="admin-table-search"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters((f) => ({ ...f, search: searchInput.trim() }));
            }}
          >
            <Search size={16} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email, or phone — press Enter" />
          </form>
          <div className="admin-toolbar-group">
            <select className="admin-select" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
              <option value="all">All roles</option>
              <option value="customer">Customers</option>
              <option value="admin">Admins</option>
            </select>
            <select className="admin-select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !data.customers.length ? (
          <LoadingState />
        ) : (
          <AdminTable columns={columns} rows={data.customers.map((c) => ({ ...c, id: c._id }))} emptyMessage="No accounts match these filters." />
        )}
      </section>

      {openId && <CustomerDetail customerId={openId} currentAdminId={currentAdminId} onClose={() => setOpenId(null)} onChanged={load} />}

      <AdminModal open={createOpen} onClose={() => setCreateOpen(false)} title="Add account" description="Create a customer or an additional administrator.">
        <form className="admin-form-grid" onSubmit={createAccount}>
          <Field label="Full name">
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
          </Field>
          <Field label="Phone">
            <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
          </Field>
          <Field label="Role">
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Temporary password" hint="Share it securely; they can change it in their account" full>
            <input type="password" autoComplete="new-password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
          </Field>
          <FormError message={createError} />
          <div className="admin-modal-actions">
            <button type="button" className="admin-button admin-button-light" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-button admin-button-dark">
              Create account
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
