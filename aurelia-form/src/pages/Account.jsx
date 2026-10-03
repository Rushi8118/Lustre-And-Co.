import { Link } from "react-router-dom";

/** Placeholder: accounts need a backend, which this front end does not include yet. */
export default function Account() {
  return (
    <section className="container page-head">
      <p className="eyebrow">Account</p>
      <h1>Your account</h1>
      <p className="page-lede">
        Sign-in and order history will appear here once the store is connected to a backend. Your bag and wishlist are saved on this device.
      </p>
      <p><Link to="/shop" className="text-link">Continue shopping</Link></p>
    </section>
  );
}
