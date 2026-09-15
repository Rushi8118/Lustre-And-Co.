import { Link } from "react-router-dom";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  linkLabel,
  linkTo
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>

      <div className="section-heading-side">
        {description && <p>{description}</p>}
        {linkLabel && linkTo && (
          <Link to={linkTo} className="text-link">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}