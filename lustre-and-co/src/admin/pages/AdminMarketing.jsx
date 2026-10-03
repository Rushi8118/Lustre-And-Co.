import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Send,
  Plus,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  Bell,
  Sparkles,
  Users,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  getMarketingCampaigns,
  getMarketingTemplates,
  createMarketingCampaign,
  createMarketingTemplate,
  sendMarketingCampaign,
} from "../../services/marketing";
import { StatusBadge, LoadingState, ErrorState, EmptyState } from "../components/AdminUi";
import AdminModal from "../components/AdminModal";
import { formatDateTime } from "../utils";
import DOMPurify from "dompurify";

const CAMPAIGN_TYPES = [
  { id: "newsletter", label: "Newsletter" },
  { id: "new_product", label: "New Product Announcement" },
  { id: "sale", label: "Exclusive Sale Announcement" },
  { id: "order_update", label: "Order Status Update" },
  { id: "abandoned_cart", label: "Abandoned Bag Recovery" },
  { id: "review_request", label: "Post-Purchase Review Request" },
  { id: "back_in_stock", label: "Back in Stock Alert" },
];

const AVAILABLE_VARIABLES = [
  { key: "{{customerName}}", desc: "Customer full or display name" },
  { key: "{{storeName}}", desc: "Lustre & Co." },
  { key: "{{storeUrl}}", desc: "Storefront base URL" },
  { key: "{{orderNumber}}", desc: "Order ID (e.g. LST-12345)" },
  { key: "{{trackingLink}}", desc: "Carrier package tracking link" },
  { key: "{{productName}}", desc: "Name of restocked or featured product" },
  { key: "{{discountCode}}", desc: "Promotion coupon code" },
  { key: "{{unsubscribeLink}}", desc: "Customer one-click opt-out link" },
];

export default function AdminMarketing() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [sendingCampaignId, setSendingCampaignId] = useState(null);

  // Template Form State
  const [templateForm, setTemplateForm] = useState({
    name: "",
    templateKey: "",
    campaignType: "newsletter",
    subject: "",
    preheader: "",
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'DM Sans',Arial,sans-serif;color:#1c1917;background:#faf8f5;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #ebd9c0;">
    <h2 style="color:#d6b56d;margin-top:0;">Hello {{customerName}},</h2>
    <p>Discover our latest handcrafted imitation jewelry collections curated specially for you.</p>
    <p style="margin:24px 0;">
      <a href="{{storeUrl}}" style="background:#d6b56d;color:#1c1917;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:700;">Explore Collections</a>
    </p>
    <hr style="border:none;border-top:1px solid #ebd9c0;margin:24px 0;" />
    <p style="font-size:12px;color:#a8a29e;">
      You received this email from {{storeName}}. <a href="{{unsubscribeLink}}" style="color:#78716c;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`,
    textBody: "Hello {{customerName}},\n\nDiscover our latest jewelry collections at {{storeUrl}}.\n\nTo unsubscribe: {{unsubscribeLink}}",
  });

  // Campaign Form State
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    campaignType: "newsletter",
    templateId: "",
    subject: "",
    htmlBody: "",
    textBody: "",
    scheduledAt: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [tList, cList] = await Promise.all([
        getMarketingTemplates(),
        getMarketingCampaigns(),
      ]);
      setTemplates(tList || []);
      setCampaigns(cList || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load marketing campaigns and templates.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Insert variable into template HTML
  function insertVariable(variable) {
    setTemplateForm((prev) => ({
      ...prev,
      htmlBody: `${prev.htmlBody} ${variable}`,
    }));
  }

  async function handleCreateTemplate(e) {
    e.preventDefault();
    setActionStatus("");

    try {
      await createMarketingTemplate(templateForm);
      setShowTemplateModal(false);
      setActionStatus(`Template "${templateForm.name}" created successfully.`);
      setTemplateForm({
        name: "",
        templateKey: "",
        campaignType: "newsletter",
        subject: "",
        preheader: "",
        htmlBody: "",
        textBody: "",
      });
      await loadData();
    } catch (err) {
      setActionStatus(
        err.response?.data?.message || "Could not save template. Please try again.",
      );
    }
  }

  async function handleCreateCampaign(e) {
    e.preventDefault();
    setActionStatus("");

    try {
      await createMarketingCampaign({
        ...campaignForm,
        templateId: campaignForm.templateId || undefined,
        scheduledAt: campaignForm.scheduledAt || undefined,
      });

      setShowCampaignModal(false);
      setActionStatus(`Campaign "${campaignForm.name}" created.`);
      setCampaignForm({
        name: "",
        campaignType: "newsletter",
        templateId: "",
        subject: "",
        htmlBody: "",
        textBody: "",
        scheduledAt: "",
      });
      await loadData();
    } catch (err) {
      setActionStatus(
        err.response?.data?.message || "Could not save campaign.",
      );
    }
  }

  async function handleSendNow(campaignId) {
    if (!window.confirm("Are you sure you want to dispatch this campaign to all recipients now?")) {
      return;
    }

    setSendingCampaignId(campaignId);
    setActionStatus("");

    try {
      const res = await sendMarketingCampaign(campaignId);
      setActionStatus(
        `Campaign dispatched! ${res.sentCount} emails sent successfully (${res.failedCount} failed).`,
      );
      await loadData();
    } catch (err) {
      setActionStatus(
        err.response?.data?.message || "Failed to dispatch campaign.",
      );
    } finally {
      setSendingCampaignId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Customer Engagement</span>
          <h1>Marketing Center &amp; Campaigns</h1>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => setShowTemplateModal(true)}
          >
            <Plus size={15} /> New Template
          </button>
          <button
            type="button"
            className="admin-button admin-button-gold"
            onClick={() => setShowCampaignModal(true)}
          >
            <Send size={15} /> Create Campaign
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === "campaigns" ? "is-active" : ""}`}
          onClick={() => setActiveTab("campaigns")}
        >
          <Mail size={15} /> Campaigns ({campaigns.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === "templates" ? "is-active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          <Layers size={15} /> Email Templates ({templates.length})
        </button>
      </div>

      {actionStatus && (
        <div className="admin-notice-banner" role="status">
          <Sparkles size={16} />
          <span>{actionStatus}</span>
          <button type="button" onClick={() => setActionStatus("")}>&times;</button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={loadData} />}

      {loading ? (
        <LoadingState label="Loading marketing center data…" />
      ) : activeTab === "campaigns" ? (
        /* Campaigns Ledger */
        <div className="admin-card">
          {campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet">
              Launch your first email newsletter, sale announcement, or product restock alert.
            </EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Recipients</th>
                    <th>Sent / Failed</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((camp) => (
                    <tr key={camp.id}>
                      <td>
                        <strong>{camp.name}</strong>
                        {camp.subject && (
                          <div className="admin-table-subtext">{camp.subject}</div>
                        )}
                      </td>
                      <td>
                        <span className="admin-tag-pill">{camp.campaign_type || camp.campaignType}</span>
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            camp.status === "sent"
                              ? "Completed"
                              : camp.status === "sending"
                              ? "Processing"
                              : camp.status === "scheduled"
                              ? "Scheduled"
                              : "Draft"
                          }
                          tone={
                            camp.status === "sent"
                              ? "success"
                              : camp.status === "sending"
                              ? "info"
                              : camp.status === "failed"
                              ? "danger"
                              : "neutral"
                          }
                        />
                      </td>
                      <td>{camp.total_recipients || camp.totalRecipients || 0}</td>
                      <td>
                        <span className="text-success font-semibold">
                          {camp.sent_count || camp.sentCount || 0}
                        </span>{" "}
                        /{" "}
                        <span className="text-danger">
                          {camp.failed_count || camp.failedCount || 0}
                        </span>
                      </td>
                      <td>{formatDateTime(camp.created_at || camp.createdAt)}</td>
                      <td>
                        {["draft", "scheduled"].includes(camp.status) ? (
                          <button
                            type="button"
                            className="admin-button admin-button-gold admin-button-sm"
                            disabled={sendingCampaignId === camp.id}
                            onClick={() => handleSendNow(camp.id)}
                          >
                            {sendingCampaignId === camp.id ? (
                              <>
                                <RefreshCw size={13} className="spin-icon" /> Sending…
                              </>
                            ) : (
                              <>
                                <Send size={13} /> Send Now
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="admin-muted-hint">Dispatched</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Templates Grid */
        <div className="admin-marketing-template-grid">
          {templates.length === 0 ? (
            <EmptyState title="No email templates created">
              Create reusable email layouts with variables for newsletters, order updates, and restock notifications.
            </EmptyState>
          ) : (
            templates.map((tpl) => (
              <article key={tpl.id} className="admin-card admin-template-card">
                <div className="admin-template-head">
                  <div>
                    <span className="admin-tag-pill">{tpl.campaignType}</span>
                    <h3>{tpl.name}</h3>
                    <code className="admin-code-tag">{tpl.templateKey}</code>
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary admin-button-sm"
                    onClick={() => setPreviewTemplate(tpl)}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>

                <div className="admin-template-subject-box">
                  <small>Subject Line:</small>
                  <p>{tpl.subject}</p>
                </div>

                <div className="admin-template-vars">
                  <small>Detected Variables:</small>
                  <div className="admin-var-tags">
                    {(tpl.variables || []).map((v) => (
                      <span key={v} className="admin-var-chip">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* New Template Modal */}
      {showTemplateModal && (
        <AdminModal
          title="Create Reusable Marketing Template"
          onClose={() => setShowTemplateModal(false)}
        >
          <form className="admin-form-grid" onSubmit={handleCreateTemplate}>
            <div className="admin-form-row">
              <label>
                Template Name *
                <input
                  type="text"
                  placeholder="e.g. Autumn Royal Jewelry Sale"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Template Key (Unique Identifier) *
                <input
                  type="text"
                  placeholder="autumn_sale_2026"
                  value={templateForm.templateKey}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, templateKey: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            <div className="admin-form-row">
              <label>
                Campaign Type *
                <select
                  value={templateForm.campaignType}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, campaignType: e.target.value })
                  }
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Subject Line *
                <input
                  type="text"
                  placeholder="e.g. Handcrafted Radiance Awaits You, {{customerName}} ✨"
                  value={templateForm.subject}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, subject: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            <label>
              Preheader (Preview Text)
              <input
                type="text"
                placeholder="Exclusive 20% off our Royal Kundan choker sets this weekend."
                value={templateForm.preheader}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, preheader: e.target.value })
                }
              />
            </label>

            {/* Variable inserter bar */}
            <div className="admin-var-helper-bar">
              <span>Click variable to insert:</span>
              <div className="admin-var-button-list">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="admin-var-pill"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                  >
                    + {v.key}
                  </button>
                ))}
              </div>
            </div>

            <label>
              HTML Template Body *
              <textarea
                rows={10}
                value={templateForm.htmlBody}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, htmlBody: e.target.value })
                }
                required
              />
            </label>

            <label>
              Plain Text Fallback
              <textarea
                rows={4}
                value={templateForm.textBody}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, textBody: e.target.value })
                }
              />
            </label>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="admin-button admin-button-gold">
                Save Template
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* New Campaign Modal */}
      {showCampaignModal && (
        <AdminModal
          title="Create New Marketing Campaign"
          onClose={() => setShowCampaignModal(false)}
        >
          <form className="admin-form-grid" onSubmit={handleCreateCampaign}>
            <label>
              Campaign Name *
              <input
                type="text"
                placeholder="e.g. Diwali Festive Newsletter"
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, name: e.target.value })
                }
                required
              />
            </label>

            <div className="admin-form-row">
              <label>
                Campaign Type *
                <select
                  value={campaignForm.campaignType}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      campaignType: e.target.value,
                    })
                  }
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Choose Reusable Template
                <select
                  value={campaignForm.templateId}
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    setCampaignForm({
                      ...campaignForm,
                      templateId: e.target.value,
                      subject: tpl?.subject || campaignForm.subject,
                      htmlBody: tpl?.htmlBody || campaignForm.htmlBody,
                      textBody: tpl?.textBody || campaignForm.textBody,
                    });
                  }}
                >
                  <option value="">-- Custom Template / None --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.templateKey})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Custom Subject Line (Optional override)
              <input
                type="text"
                placeholder="Leave blank to use template subject"
                value={campaignForm.subject}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, subject: e.target.value })
                }
              />
            </label>

            <label>
              Schedule Dispatch (Optional)
              <input
                type="datetime-local"
                value={campaignForm.scheduledAt}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    scheduledAt: e.target.value,
                  })
                }
              />
              <small className="admin-field-hint">
                Leave empty to save as draft and dispatch manually when ready.
              </small>
            </label>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => setShowCampaignModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="admin-button admin-button-gold">
                Create Campaign
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <AdminModal
          title={`Preview: ${previewTemplate.name}`}
          onClose={() => setPreviewTemplate(null)}
        >
          <div className="admin-preview-box">
            <div className="admin-preview-meta">
              <p>
                <strong>Subject:</strong> {previewTemplate.subject}
              </p>
              {previewTemplate.preheader && (
                <p>
                  <strong>Preheader:</strong> {previewTemplate.preheader}
                </p>
              )}
            </div>
            <div
              className="admin-preview-html-frame"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  previewTemplate.htmlBody
                    .replace(/{{customerName}}/g, "Priya Sharma")
                    .replace(/{{storeName}}/g, "Lustre & Co.")
                    .replace(/{{storeUrl}}/g, "https://lustreandco.com")
                    .replace(/{{orderNumber}}/g, "LST-849201")
                    .replace(/{{trackingLink}}/g, "https://shiprocket.co/tracking/LST849201")
                    .replace(/{{unsubscribeLink}}/g, "#"),
                ),
              }}
            />
          </div>
        </AdminModal>
      )}
    </div>
  );
}
