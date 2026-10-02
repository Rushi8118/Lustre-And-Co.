import { Link } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import CmsPageState from "../components/CmsPageState";
import useCmsPage, { toAnchor, toParagraphs } from "../hooks/useCmsPage";

export default function ShippingReturns() {
  const { page, status, error } = useCmsPage("shipping-returns");
  if (status !== "ready") return <CmsPageState status={status} error={error} />;

  const sections = (page.sections || []).map((section, index) => ({
    ...section,
    anchor: toAnchor(section.heading, `section-${index + 1}`)
  }));

  return (
    <>
      <PageIntro
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "Shipping and Returns" }]}
      />

      <section className="section policy-section">
        <div className="container policy-layout">
          <aside className="policy-sidebar">
            {sections.map((section) => (
              <a key={section.anchor} href={`#${section.anchor}`}>
                {section.heading}
              </a>
            ))}
          </aside>

          <article className="policy-content">
            {sections.map((section) => (
              <section id={section.anchor} key={section.anchor}>
                {section.eyebrow && <span className="eyebrow">{section.eyebrow}</span>}
                {section.heading && <h2>{section.heading}</h2>}
                {toParagraphs(section.body).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {section.bullets?.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <Link to="/contact" className="button button-dark">
              Contact support
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
