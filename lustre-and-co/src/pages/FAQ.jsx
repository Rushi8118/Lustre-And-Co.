import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import api from "../services/api";

export default function FAQ() {
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    api
      .get("/faqs")
      .then(({ data }) => {
        if (!active) return;
        const byGroup = new Map();
        for (const faq of data) {
          if (!byGroup.has(faq.group)) byGroup.set(faq.group, []);
          byGroup.get(faq.group).push(faq);
        }
        setGroups([...byGroup.entries()].map(([title, questions]) => ({ title, questions })));
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="Need a little clarity?"
        title="Frequently asked questions"
        description="Find helpful answers about products, orders, payments, shipping, and returns."
        breadcrumbs={[{ label: "FAQ" }]}
      />

      <section className="section faq-section">
        <div className="container faq-container">
          {status === "loading" && <p className="catalog-loading">Loading answers…</p>}
          {status === "error" && <p className="inline-alert inline-alert-error">The FAQ could not be loaded right now.</p>}
          {status === "ready" && groups.length === 0 && (
            <p className="catalog-loading">
              No questions have been published yet. <Link to="/contact">Contact us</Link> and we’ll help.
            </p>
          )}

          {groups.map((group) => (
            <div className="faq-group" key={group.title}>
              <span className="eyebrow">{group.title}</span>
              <div className="faq-list">
                {group.questions.map((faq) => (
                  <details key={faq._id}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
