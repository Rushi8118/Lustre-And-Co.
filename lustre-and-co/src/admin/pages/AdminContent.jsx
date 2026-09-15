import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CheckboxField, ErrorState, Field, FormError, LoadingState } from "../components/AdminUi";
import { arrayToLines, linesToArray } from "../utils";
import { useSettings } from "../../context/SettingsContext";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

function Card({ eyebrow, title, children }) {
  return (
    <section className="admin-settings-card">
      <div className="admin-settings-card-heading">
        <span className="admin-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="admin-form-grid">{children}</div>
    </section>
  );
}

export default function AdminContent() {
  const { reload } = useSettings();
  const { showToast } = useStore();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/admin/settings");
      setDraft({
        announcement: { ...data.announcement, messagesText: arrayToLines(data.announcement.messages) },
        homepage: data.homepage,
        newsletter: data.newsletter,
        seo: data.seo
      });
    } catch (err) {
      setError(getErrorMessage(err, "Content could not be loaded."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Updates a nested value, e.g. set("homepage.hero.title")
  const set = (path) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setDraft((current) => {
      const next = structuredClone(current);
      const keys = path.split(".");
      let node = next;
      keys.slice(0, -1).forEach((key) => {
        node = node[key];
      });
      node[keys.at(-1)] = value;
      return next;
    });
  };

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const { messagesText, ...announcement } = draft.announcement;
      await api.put("/admin/settings", {
        announcement: { ...announcement, messages: linesToArray(messagesText) },
        homepage: draft.homepage,
        newsletter: draft.newsletter,
        seo: draft.seo
      });
      await reload();
      showToast("Storefront content published.", "success");
    } catch (err) {
      setSaveError(getErrorMessage(err, "Content could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!draft) return <LoadingState label="Loading content…" />;

  const { homepage } = draft;
  const text = (path, label, props = {}) => (
    <Field label={label} full={props.full}>
      {props.multiline ? (
        <textarea value={path.split(".").reduce((o, k) => o[k], draft) || ""} onChange={set(path)} />
      ) : (
        <input value={path.split(".").reduce((o, k) => o[k], draft) || ""} onChange={set(path)} />
      )}
    </Field>
  );

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Storefront</span>
          <h1>Homepage &amp; banners</h1>
          <p>Edit the announcement bar, homepage sections, newsletter block, and SEO metadata.</p>
        </div>
      </div>

      <div className="admin-settings-content">
        <Card eyebrow="Top of every page" title="Announcement bar">
          <CheckboxField label="Show announcement bar" checked={draft.announcement.enabled} onChange={set("announcement.enabled")} full />
          <Field label="Messages" hint="One message per line" full>
            <textarea value={draft.announcement.messagesText} onChange={set("announcement.messagesText")} />
          </Field>
        </Card>

        <Card eyebrow="Homepage" title="Hero">
          {text("homepage.hero.eyebrow", "Eyebrow")}
          {text("homepage.hero.title", "Title")}
          {text("homepage.hero.highlight", "Highlighted word(s)")}
          {text("homepage.hero.subtitle", "Subtitle", { full: true, multiline: true })}
          {text("homepage.hero.primaryCtaLabel", "Primary button label")}
          {text("homepage.hero.primaryCtaLink", "Primary button link")}
          {text("homepage.hero.secondaryCtaLabel", "Secondary link label")}
          {text("homepage.hero.secondaryCtaLink", "Secondary link")}
          {text("homepage.hero.cardEyebrow", "Floating card eyebrow")}
          {text("homepage.hero.cardTitle", "Floating card title")}
          {text("homepage.hero.cardText", "Floating card text", { full: true })}
        </Card>

        <Card eyebrow="Homepage" title="Section headings">
          {["categoriesSection", "newArrivalsSection", "bestSellersSection"].map((key) => (
            <div key={key} className="admin-section-editor">
              <strong className="admin-muted">{{ categoriesSection: "Categories", newArrivalsSection: "New arrivals", bestSellersSection: "Best sellers" }[key]}</strong>
              <div className="admin-form-grid">
                {text(`homepage.${key}.eyebrow`, "Eyebrow")}
                {text(`homepage.${key}.title`, "Title")}
                {text(`homepage.${key}.description`, "Description", { full: true })}
              </div>
            </div>
          ))}
        </Card>

        <Card eyebrow="Homepage" title="Editorial banner">
          <CheckboxField label="Show editorial banner" checked={homepage.editorial.enabled} onChange={set("homepage.editorial.enabled")} full />
          {text("homepage.editorial.eyebrow", "Eyebrow")}
          {text("homepage.editorial.title", "Title")}
          {text("homepage.editorial.text", "Text", { full: true, multiline: true })}
          {text("homepage.editorial.ctaLabel", "Button label")}
          {text("homepage.editorial.ctaLink", "Button link")}
          {text("homepage.editorial.image", "Image URL", { full: true })}
        </Card>

        <Card eyebrow="Homepage" title="Promotional banner">
          <CheckboxField label="Show promotional banner" checked={homepage.promo.enabled} onChange={set("homepage.promo.enabled")} full />
          {text("homepage.promo.eyebrow", "Eyebrow")}
          {text("homepage.promo.heading", "Heading")}
          {text("homepage.promo.highlight", "Highlighted text")}
          {text("homepage.promo.text", "Text", { full: true, multiline: true })}
          {text("homepage.promo.ctaLabel", "Button label")}
          {text("homepage.promo.ctaLink", "Button link")}
          {text("homepage.promo.tagTitle", "Floating tag title (e.g. coupon code)")}
          {text("homepage.promo.tagText", "Floating tag text")}
          {text("homepage.promo.image", "Image URL", { full: true })}
        </Card>

        <Card eyebrow="Homepage" title="Testimonial">
          <CheckboxField label="Show testimonial section" checked={homepage.testimonial.enabled} onChange={set("homepage.testimonial.enabled")} full />
          {text("homepage.testimonial.eyebrow", "Eyebrow")}
          {text("homepage.testimonial.author", "Author")}
          {text("homepage.testimonial.quote", "Quote", { full: true, multiline: true })}
        </Card>

        <Card eyebrow="Footer" title="Newsletter block">
          <CheckboxField label="Show newsletter signup" checked={draft.newsletter.enabled} onChange={set("newsletter.enabled")} full />
          {text("newsletter.kicker", "Kicker")}
          {text("newsletter.heading", "Heading")}
          {text("newsletter.description", "Description", { full: true, multiline: true })}
          {text("newsletter.couponCode", "Coupon shown after signup (blank for none)")}
        </Card>

        <Card eyebrow="Search engines" title="SEO">
          {text("seo.metaTitle", "Page title", { full: true })}
          {text("seo.metaDescription", "Meta description", { full: true, multiline: true })}
        </Card>

        <div className="admin-settings-save-bar">
          <FormError message={saveError} />
          <button type="button" className="admin-button admin-button-dark" onClick={save} disabled={saving}>
            <Check size={15} /> {saving ? "Publishing…" : "Publish changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
