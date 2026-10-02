import { Link } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import CmsPageState from "../components/CmsPageState";
import useCmsPage, { toParagraphs } from "../hooks/useCmsPage";

export default function About() {
  const { page, status, error } = useCmsPage("about");
  if (status !== "ready") return <CmsPageState status={status} error={error} />;

  const [story, ...sections] = page.sections || [];

  return (
    <>
      <PageIntro
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "About Us" }]}
        tone="dark"
      />

      {story && (
        <section className="section about-story-section">
          <div className="container about-story-grid">
            {story.image && (
              <div className="about-story-image">
                <img src={story.image} alt={story.heading || page.title} />
              </div>
            )}

            <div className="about-story-copy">
              {story.eyebrow && <span className="eyebrow">{story.eyebrow}</span>}
              {story.heading && <h2>{story.heading}</h2>}
              {toParagraphs(story.body).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {story.bullets?.length > 0 && (
                <ul>
                  {story.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {story.ctaLabel && (
                <Link to={story.ctaLink || "/shop"} className="button button-dark">
                  {story.ctaLabel}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {sections.map((section, sectionIndex) => (
        <section className={`section ${sectionIndex % 2 === 0 ? "section-beige" : ""}`} key={sectionIndex}>
          <div className="container values-section">
            {(section.eyebrow || section.heading) && (
              <div className="section-heading">
                <div>
                  {section.eyebrow && <span className="eyebrow">{section.eyebrow}</span>}
                  {section.heading && <h2>{section.heading}</h2>}
                </div>
              </div>
            )}

            {toParagraphs(section.body).map((paragraph, index) => (
              <p key={index} className="cms-paragraph">
                {paragraph}
              </p>
            ))}

            {section.items?.length > 0 && (
              <div className="values-grid">
                {section.items.map((item, index) => (
                  <article key={`${item.title}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            )}

            {section.ctaLabel && (
              <Link to={section.ctaLink || "/shop"} className="button button-dark">
                {section.ctaLabel}
              </Link>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
