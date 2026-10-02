import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function StatCard({ label, value, change, note, icon: Icon, tone = "gold" }) {
  const hasChange = typeof change === "number";
  const trend = !hasChange || change === 0 ? "flat" : change > 0 ? "up" : "down";

  return (
    <article className={`admin-stat-card admin-stat-${tone}`}>
      <div className="admin-stat-top">
        <span>{label}</span>
        <div className="admin-stat-icon">
          <Icon size={18} />
        </div>
      </div>

      <strong>{value}</strong>

      <div className={`admin-stat-change ${trend === "down" ? "down" : "up"}`}>
        {hasChange ? (
          <>
            {trend === "up" && <ArrowUpRight size={14} />}
            {trend === "down" && <ArrowDownRight size={14} />}
            {trend === "flat" && <Minus size={14} />}
            <span>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <small>vs previous period</small>
          </>
        ) : (
          <small>{note || "No earlier data to compare"}</small>
        )}
      </div>
    </article>
  );
}
