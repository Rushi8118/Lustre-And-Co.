import { Droplets, Gem, Heart, Package, Sparkles } from "lucide-react";
import PageIntro from "../components/PageIntro";
import CmsPageState from "../components/CmsPageState";
import useCmsPage, { toParagraphs } from "../hooks/useCmsPage";

const CARD_ICONS = [Droplets, Sparkles, Package, Gem, Heart];

export default function JewelryCare() {
  const { page, status, error } = useCmsPage("jewelry-care");
  if (status !== "ready") return <CmsPageState status={status} error={error} />;

  const [intro, ...sections] = page.sections || [];
  let cardSectionRendered = false;

  return (
    <>
      <PageIntro
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "Jewelry Care Guide" }]}
        tone="rose"
      />

      {intro && (
        <section className="section care-intro-section">
          <div className="container care-intro">
            {intro.eyebrow && <span className="eyebrow">{intro.eyebrow}</span>}
            {intro.heading && <h2>{intro.heading}</h2>}
            {toParagraphs(intro.body).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {sections.map((section, sectionIndex) => {
        const heading = (section.eyebrow || section.heading) && (
          <div className="section-heading">
            <div>
              {section.eyebrow && <span className="eyebrow">{section.eyebrow}</span>}
              {section.heading && <h2>{section.heading}</h2>}
            </div>
          </div>
        );

        // The first section with items renders as icon cards; later ones as a simple grid.
        if (section.items?.length && !cardSectionRendered) {
          cardSectionRendered = true;
          return (
            <section className="section section-beige" key={sectionIndex}>
              <div className="container">
                {heading}
                <div className="care-grid">
                  {section.items.map((item, index) => {
                    const Icon = CARD_ICONS[index % CARD_ICONS.length];
                    return (
                      <article className="care-card" key={`${item.title}-${index}`}>
                        <div className="care-card-icon">
                          <Icon size={21} />
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="section care-type-section" key={sectionIndex}>
            <div className="container">
              {heading}
              {toParagraphs(section.body).map((paragraph, index) => (
                <p key={index} className="cms-paragraph">
                  {paragraph}
                </p>
              ))}
              {section.items?.length > 0 && (
                <div className="care-type-grid">
                  {section.items.map((item, index) => (
                    <article key={`${item.title}-${index}`}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
