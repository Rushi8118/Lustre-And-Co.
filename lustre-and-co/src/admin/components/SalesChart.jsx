import { useMemo } from "react";
import { useSettings } from "../../context/SettingsContext";
import { formatCompactPrice } from "../utils";

export default function SalesChart({ data = [] }) {
  const { commerce } = useSettings();

  const max = useMemo(() => Math.max(...data.map((item) => item.amount), 1), [data]);

  const points = useMemo(() => {
    if (data.length <= 1) return "0,100 100,100";
    return data
      .map((item, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - (item.amount / max) * 82;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, max]);

  // Keep labels readable when there are many buckets.
  const labelStep = Math.ceil(data.length / 8);

  return (
    <div className="sales-chart">
      <div className="sales-chart-y-axis">
        {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
          <span key={fraction}>{formatCompactPrice(max * fraction, commerce.currency)}</span>
        ))}
      </div>

      <div className="sales-chart-stage">
        <div className="sales-chart-grid-lines">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="sales-chart-svg"
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          role="img"
          aria-label="Revenue trend"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#salesGradient)" />
          <polyline
            points={points}
            fill="none"
            stroke="#d4af37"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          >
            <title>{data.map((d) => `${d.label}: ${d.amount}`).join(", ")}</title>
          </polyline>
        </svg>

        <div className="sales-chart-labels">
          {data.map((item, idx) => (
            <span key={`${item.label}-${idx}`}>{idx % labelStep === 0 ? item.label : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
