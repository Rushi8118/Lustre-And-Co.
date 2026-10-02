import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, FileText, Lock, Mail } from "lucide-react";
import PageIntro from "../components/PageIntro";
import CmsPageState from "../components/CmsPageState";
import { useSettings } from "../context/SettingsContext";
import useCmsPage, { toParagraphs } from "../hooks/useCmsPage";

export default function Legal({ tab = "privacy" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const activeTab = location.pathname === "/terms" ? "terms" : location.pathname === "/privacy" ? "privacy" : tab;
  const { page, status, error } = useCmsPage(activeTab);

  if (status !== "ready") return <CmsPageState status={status} error={error} />;

  return (
    <>
      <PageIntro
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "Legal" }, { label: page.title }]}
      />

      <section className="section legal-page-section">
        <div className="container">
          <div className="legal-layout-grid">
            <aside className="legal-sidebar">
              <div className="legal-nav-box">
                <button
                  type="button"
                  className={`legal-nav-btn ${activeTab === "privacy" ? "active" : ""}`}
                  onClick={() => navigate("/privacy")}
                >
                  <Lock size={16} />
                  <span>Privacy Policy</span>
                </button>
                <button
                  type="button"
                  className={`legal-nav-btn ${activeTab === "terms" ? "active" : ""}`}
                  onClick={() => navigate("/terms")}
                >
                  <FileText size={16} />
                  <span>Terms &amp; Conditions</span>
                </button>
              </div>

              {settings.store.supportEmail && (
                <div className="legal-help-card">
                  <ShieldCheck size={20} className="legal-shield-icon" />
                  <h4>Questions or Concerns?</h4>
                  <p>Our team is happy to help with privacy, legal, or order questions.</p>
                  <a href={`mailto:${settings.store.supportEmail}`} className="button button-outline-dark button-sm">
                    <Mail size={14} /> Email us
                  </a>
                </div>
              )}
            </aside>

            <main className="legal-content-article">
              <article className="legal-document">
                <div className="document-header">
                  <span className="eyebrow">
                    Last updated:{" "}
                    {new Date(page.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <h2>{page.title}</h2>
                  {page.description && <p className="lead-text">{page.description}</p>}
                </div>

                {(page.sections || []).map((section, index) => (
                  <div className="legal-section-block" key={index}>
                    {section.heading && <h3>{section.heading}</h3>}
                    {toParagraphs(section.body).map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))}
                    {section.bullets?.length > 0 && (
                      <ul>
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </article>
            </main>
          </div>
        </div>
      </section>
    </>
  );
}
