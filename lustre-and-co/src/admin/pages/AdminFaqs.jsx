import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminModal from "../components/AdminModal";
import { CheckboxField, EmptyState, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const blank = { question: "", answer: "", group: "", sortOrder: 0, isActive: true };

export default function AdminFaqs() {
  const { showToast } = useStore();
  const [faqs, setFaqs] = useState([]);
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
      const { data } = await api.get("/admin/faqs");
      setFaqs(data);
    } catch (err) {
      setError(getErrorMessage(err, "FAQs could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map();
    faqs.forEach((faq) => {
      if (!map.has(faq.group)) map.set(faq.group, []);
      map.get(faq.group).push(faq);
    });
    return [...map.entries()];
  }, [faqs]);

  function openModal(faq = null) {
    setEditing(faq);
    setForm(faq ? { ...blank, ...faq } : { ...blank, group: groups[0]?.[0] || "" });
    setFormError("");
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      group: form.group.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive
    };
    try {
      if (editing) await api.put(`/admin/faqs/${editing._id}`, payload);
      else await api.post("/admin/faqs", payload);
      showToast("FAQ saved.", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err, "The FAQ could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(faq) {
    try {
      await api.put(`/admin/faqs/${faq._id}`, { isActive: !faq.isActive });
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "Could not update the FAQ."), "error");
    }
  }

  async function remove(faq) {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      await api.delete(`/admin/faqs/${faq._id}`);
      showToast("FAQ deleted.", "success");
      load();
    } catch (err) {
      showToast(getErrorMessage(err, "The FAQ could not be deleted."), "error");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Storefront</span>
          <h1>FAQs</h1>
          <p>Questions shown on the FAQ page, grouped by topic.</p>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
          </button>
          <button type="button" className="admin-button admin-button-dark" onClick={() => openModal()}>
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !faqs.length && <LoadingState />}
      {!loading && !error && faqs.length === 0 && <EmptyState title="No FAQs yet">Add your first question.</EmptyState>}

      {groups.map(([group, items]) => (
        <section className="admin-panel" key={group} style={{ marginBottom: 18 }}>
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Group</span>
              <h2>{group}</h2>
            </div>
          </div>
          <div className="admin-review-list">
            {items.map((faq) => (
              <article className="admin-review-card" key={faq._id}>
                <div className="admin-card-row">
                  <h4>{faq.question}</h4>
                  <StatusBadge tone={faq.isActive ? "success" : "info"}>{faq.isActive ? "Visible" : "Hidden"}</StatusBadge>
                </div>
                <p className="admin-card-body">{faq.answer}</p>
                <div className="admin-row-actions">
                  <button className="admin-action-button" onClick={() => toggle(faq)}>
                    {faq.isActive ? "Hide" : "Show"}
                  </button>
                  <button className="admin-action-button" onClick={() => openModal(faq)} title="Edit">
                    <Edit3 size={15} />
                  </button>
                  <button className="admin-action-button danger" onClick={() => remove(faq)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit FAQ" : "New FAQ"}>
        <form className="admin-form-grid" onSubmit={save}>
          <Field label="Question" full>
            <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
          </Field>
          <Field label="Answer" full>
            <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
          </Field>
          <Field label="Group" hint="Choose an existing group or type a new one">
            <input list="faq-groups" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} required />
            <datalist id="faq-groups">
              {groups.map(([group]) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </Field>
          <CheckboxField label="Visible on FAQ page" checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} full />
          <FormError message={formError} />
          <div className="admin-modal-actions">
            <button type="button" className="admin-button admin-button-light" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
              {saving ? "Saving…" : "Save FAQ"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
