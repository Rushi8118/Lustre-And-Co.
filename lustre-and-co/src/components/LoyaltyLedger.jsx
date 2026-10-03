// lustre-and-co/src/components/LoyaltyLedger.jsx
import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getLoyaltyLedger } from "../services/loyalty";

const TYPE_LABELS = {
  purchase:          { label: "Purchase Reward",         emoji: "🛍" },
  review:            { label: "Review Reward",           emoji: "⭐" },
  referral_inviter:  { label: "Referral Reward",         emoji: "👥" },
  referral_friend:   { label: "Welcome Reward",          emoji: "🎉" },
  birthday:          { label: "Birthday Reward",         emoji: "🎂" },
  admin_adjustment:  { label: "Account Adjustment",      emoji: "🔧" },
  redemption:        { label: "Points Redeemed",         emoji: "💳" },
  expiration:        { label: "Points Expired",          emoji: "⏰" },
  refund_reversal:   { label: "Refund Reversal",         emoji: "↩" },
};

const formatDate = (v) =>
  new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function LoyaltyLedger() {
  const [result, setResult] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getLoyaltyLedger({ page, limit: 20 })
      .then(setResult)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [page]);

  const { entries, total, totalPages } = result;

  return (
    <div className="loyalty-ledger">
      <div className="loyalty-ledger-header">
        <h3 className="loyalty-section-title">Rewards History</h3>
        {total > 0 && <span className="loyalty-ledger-count">{total} transaction{total !== 1 ? "s" : ""}</span>}
      </div>

      {loading ? (
        <div className="loyalty-ledger-empty"><p>Loading history…</p></div>
      ) : entries.length === 0 ? (
        <div className="loyalty-ledger-empty">
          <span className="loyalty-ledger-empty-icon">✦</span>
          <p>No reward activity yet. Start shopping to earn your first points!</p>
        </div>
      ) : (
        <>
          <ul className="loyalty-ledger-list">
            {entries.map((entry) => {
              const info = TYPE_LABELS[entry.transactionType] ?? { label: entry.transactionType, emoji: "•" };
              const positive = entry.points > 0;
              return (
                <li key={entry.id} className="loyalty-ledger-item">
                  <span className="loyalty-ledger-emoji">{info.emoji}</span>
                  <div className="loyalty-ledger-meta">
                    <strong className="loyalty-ledger-label">{info.label}</strong>
                    {entry.description && <p className="loyalty-ledger-desc">{entry.description}</p>}
                    <span className="loyalty-ledger-date">{formatDate(entry.createdAt)}</span>
                  </div>
                  <div className={`loyalty-ledger-pts ${positive ? "positive" : "negative"}`}>
                    {positive ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                    <span>{positive ? "+" : ""}{entry.points.toLocaleString()} pts</span>
                    {entry.walletAmount > 0 && (
                      <span className="loyalty-ledger-wallet">+₹{Number(entry.walletAmount).toFixed(2)}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="loyalty-ledger-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="loyalty-page-btn">
                <ChevronLeft size={16} />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="loyalty-page-btn">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
