import { Check, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, StatusBadge, Tabs } from "../components/AdminUi";
import { formatDate } from "../utils";
import { useStore } from "../../context/StoreContext";
import api, { getErrorMessage } from "../../services/api";

const TONES = { pending: "warning", approved: "success", rejected: "danger" };

export default function AdminReviews() {
  const { showToast, refreshProducts } = useStore();
  const { refreshAttention } = useOutletContext();
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({ reviews: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: response } = await api.get("/admin/reviews", { params: { status, search: search || undefined } });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Reviews could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(review, nextStatus) {
    try {
      await api.patch(`/admin/reviews/${review._id}`, { status: nextStatus });
      showToast(`Review ${nextStatus}. Product rating updated.`, "success");
      load();
      refreshAttention();
      refreshProducts();
    } catch (err) {
      showToast(getErrorMessage(err, "The review could not be updated."), "error");
    }
  }

  async function remove(review) {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await api.delete(`/admin/reviews/${review._id}`);
      showToast("Review deleted.", "success");
      load();
      refreshAttention();
      refreshProducts();
    } catch (err) {
      showToast(getErrorMessage(err, "The review could not be deleted."), "error");
    }
  }

  const counts = data.counts || {};

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Catalog</span>
          <h1>Reviews</h1>
          <p>Approve reviews before they appear on product pages. Ratings update automatically.</p>
        </div>
        <button type="button" className="admin-button admin-button-light" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: "pending", label: "Pending", count: counts.pending || 0 },
          { value: "approved", label: "Approved", count: counts.approved || 0 },
          { value: "rejected", label: "Rejected", count: counts.rejected || 0 },
          { value: "all", label: "All" }
        ]}
      />

      <section className="admin-panel">
        <div className="admin-toolbar">
          <form
            className="admin-table-search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <Search size={16} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Author, title, or text — press Enter" />
          </form>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !data.reviews.length && <LoadingState />}
        {!loading && !error && data.reviews.length === 0 && <EmptyState title="No reviews here">Nothing matches this filter.</EmptyState>}

        <div className="admin-review-list">
          {data.reviews.map((review) => (
            <article className="admin-review-card" key={review._id}>
              <div className="admin-card-row">
                <div className="admin-product-cell">
                  {review.product?.image && <img src={review.product.image} alt="" />}
                  <div>
                    <strong>{review.product?.name || "Deleted product"}</strong>
                    <small>
                      by {review.author} · {formatDate(review.createdAt)}
                      {review.verifiedPurchase ? " · Verified buyer" : ""}
                    </small>
                  </div>
                </div>
                <StatusBadge tone={TONES[review.status]}>{review.status}</StatusBadge>
              </div>

              <div>
                <span className="admin-stars" aria-label={`${review.rating} out of 5`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>{" "}
                <strong>{review.title}</strong>
              </div>
              <p className="admin-card-body">{review.comment}</p>

              <div className="admin-row-actions">
                {review.status !== "approved" && (
                  <button className="admin-button admin-button-dark" onClick={() => moderate(review, "approved")}>
                    <Check size={14} /> Approve
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button className="admin-button admin-button-light" onClick={() => moderate(review, "rejected")}>
                    <X size={14} /> Reject
                  </button>
                )}
                <button className="admin-action-button danger" onClick={() => remove(review)} title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
