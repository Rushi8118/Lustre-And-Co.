import { ArrowDown, ArrowUp, Edit3, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminModal from "../components/AdminModal";
import AdminTable from "../components/AdminTable";
import { CheckboxField, ErrorState, Field, FormError, LoadingState, StatusBadge } from "../components/AdminUi";
import { arrayToLines, formatDateTime, linesToArray } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const PAGE_ROUTES = {
  about: "/about",
  "shipping-returns": "/shipping-returns",
  "jewelry-care": "/jewelry-care",
  privacy: "/privacy",
  terms: "/terms"
};

const toEditableSection = (section) => ({
  eyebrow: section.eyebrow || "",
  heading: section.heading || "",
  body: section.body || "",
  bulletsText: arrayToLines(section.bullets),
  itemsText: (section.items || []).map((item) => `${item.title} | ${item.text}`).join("\n"),
  image: section.image || "",
  ctaLabel: section.ctaLabel || "",
  ctaLink: section.ctaLink || ""
});

const toApiSection = (section) => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  body: section.body,
  bullets: linesToArray(section.bulletsText),
  items: linesToArray(section.itemsText).map((line) => {
    const [title, ...rest] = line.split("|");
    return { title: title.trim(), text: rest.join("|").trim() };
  }),
  image: section.image.trim(),
  ctaLabel: section.ctaLabel,
  ctaLink: section.ctaLink
});

export default function AdminPages() {
  const { showToast } = useStore();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/pages");
      setPages(data);
    } catch (err) {
      setError(getErrorMessage(err, "Pages could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEditor(page) {
    setEditing(page);
    setForm({
      title: page.title,
      eyebrow: page.eyebrow || "",
      description: page.description || "",
      isPublished: page.isPublished,
      sections: (page.sections || []).map(toEditableSection)
    });
    setFormError("");
  }

  const updateSection = (index, field) => (event) =>
    setForm((current) => ({
      ...current,
      sections: current.sections.map((s, i) => (i === index ? { ...s, [field]: event.target.value } : s))
    }));

  function moveSection(index, delta) {
    setForm((current) => {
      const sections = [...current.sections];
      const target = index + delta;
      if (target < 0 || target >= sections.length) return current;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api.put(`/admin/pages/${editing.slug}`, {
        title: form.title.trim(),
        eyebrow: form.eyebrow,
        description: form.description,
        isPublished: form.isPublished,
        sections: form.sections.map(toApiSection)
      });
      showToast(`“${form.title}” saved.`, "success");
      setEditing(null);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err, "The page could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "title",
      label: "Page",
      render: (row) => (
        <div>
          <strong>{row.title}</strong>
          <small className="admin-table-subtext">{PAGE_ROUTES[row.slug] || `/${row.slug}`}</small>
        </div>
      )
    },
    { key: "sections", label: "Sections", render: (row) => row.sections?.length || 0 },
    { key: "updatedAt", label: "Last updated", render: (row) => formatDateTime(row.updatedAt) },
    {
      key: "isPublished",
      label: "Status",
      render: (row) => <StatusBadge tone={row.isPublished ? "success" : "info"}>{row.isPublished ? "Published" : "Draft"}</StatusBadge>
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="admin-row-actions">
          {PAGE_ROUTES[row.slug] && row.isPublished && (
            <a className="admin-action-button" href={PAGE_ROUTES[row.slug]} target="_blank" rel="noreferrer" title="View page">
              <ExternalLink size={15} />
            </a>
          )}
          <button className="admin-action-button" onClick={() => openEditor(row)} title="Edit">
            <Edit3 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Storefront</span>
          <h1>Content pages</h1>
          <p>Edit About, Shipping &amp; Returns, Jewelry Care, Privacy Policy, and Terms.</p>
        </div>
        <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      <section className="admin-panel">
        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !pages.length ? (
          <LoadingState />
        ) : (
          <AdminTable columns={columns} rows={pages.map((p) => ({ ...p, id: p._id }))} emptyMessage="No pages found. Run the seed command to create them." />
        )}
      </section>

      {editing && form && (
        <AdminModal open onClose={() => setEditing(null)} title={`Edit “${editing.title}”`} description="Separate paragraphs with a blank line." wide>
          <form className="admin-form-grid" onSubmit={save}>
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Eyebrow">
              <input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} />
            </Field>
            <Field label="Intro description" full>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <CheckboxField label="Published" checked={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value })} full />

            <div className="admin-section-editor">
              {form.sections.map((section, index) => (
                <div className="admin-section-card" key={index}>
                  <div className="admin-section-card-head">
                    <span>Section {index + 1}</span>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-action-button" onClick={() => moveSection(index, -1)} disabled={index === 0} title="Move up">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="admin-action-button" onClick={() => moveSection(index, 1)} disabled={index === form.sections.length - 1} title="Move down">
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-action-button danger"
                        onClick={() => setForm({ ...form, sections: form.sections.filter((_, i) => i !== index) })}
                        title="Remove section"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="admin-form-grid">
                    <Field label="Eyebrow">
                      <input value={section.eyebrow} onChange={updateSection(index, "eyebrow")} />
                    </Field>
                    <Field label="Heading">
                      <input value={section.heading} onChange={updateSection(index, "heading")} />
                    </Field>
                    <Field label="Body" full>
                      <textarea value={section.body} onChange={updateSection(index, "body")} />
                    </Field>
                    <Field label="Bullet points" hint="One per line">
                      <textarea value={section.bulletsText} onChange={updateSection(index, "bulletsText")} />
                    </Field>
                    <Field label="Cards" hint="One per line: Title | Text">
                      <textarea value={section.itemsText} onChange={updateSection(index, "itemsText")} />
                    </Field>
                    <Field label="Image URL" full>
                      <input value={section.image} onChange={updateSection(index, "image")} />
                    </Field>
                    <Field label="Button label">
                      <input value={section.ctaLabel} onChange={updateSection(index, "ctaLabel")} />
                    </Field>
                    <Field label="Button link">
                      <input value={section.ctaLink} onChange={updateSection(index, "ctaLink")} />
                    </Field>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="admin-button admin-button-light"
                onClick={() => setForm({ ...form, sections: [...form.sections, toEditableSection({})] })}
              >
                <Plus size={15} /> Add section
              </button>
            </div>

            <FormError message={formError} />
            <div className="admin-modal-actions">
              <button type="button" className="admin-button admin-button-light" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-button admin-button-dark" disabled={saving}>
                {saving ? "Saving…" : "Save page"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
