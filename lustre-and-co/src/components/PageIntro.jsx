import { Link } from "react-router-dom";

export default function PageIntro({
  eyebrow = "Lustre & Co.",
  title,
  description,
  breadcrumbs = [],
  tone = "light"
}) {
  return (
    <section className={`page-intro page-intro-${tone}`}>
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              <b>/</b>
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
            </span>
          ))}
        </div>

        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </section>
  );
}