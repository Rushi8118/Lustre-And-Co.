import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="container page-head">
      <p className="eyebrow">Not found</p>
      <h1>This page has slipped out of the light.</h1>
      <p><Link to="/" className="text-link">Return home</Link></p>
    </section>
  );
}
