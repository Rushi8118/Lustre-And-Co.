import { JOURNAL } from "../data/products";
import Reveal from "../components/Reveal";

export default function Journal() {
  return (
    <>
      <section className="container page-head">
        <Reveal>
          <p className="eyebrow">Journal</p>
          <h1>Notes from the studio</h1>
          <p className="page-lede">Short essays on shape, light and the rhythm of wearing jewellery.</p>
        </Reveal>
      </section>
      <section className="container journal-list">
        {JOURNAL.map((article) => (
          <Reveal key={article.slug} as="article" className="journal-article">
            <h2>{article.title}</h2>
            {article.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>
        ))}
      </section>
    </>
  );
}
