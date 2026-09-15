import { AlertCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="admin-state" role="status">
      <RefreshCw size={16} className="spin-icon" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="admin-state admin-state-error" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="admin-button admin-button-light" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Field({ label, hint, full = false, children }) {
  return (
    <label className={full ? "admin-form-full" : undefined}>
      {label}
      {children}
      {hint && <small className="admin-field-hint">{hint}</small>}
    </label>
  );
}

export function CheckboxField({ label, checked, onChange, full = false, disabled = false }) {
  return (
    <label className={`admin-check ${full ? "admin-form-full" : ""}`}>
      <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p className="admin-form-error admin-form-full" role="alert">
      {message}
    </p>
  );
}

export function StatusBadge({ tone = "warning", children }) {
  return <span className={`admin-status-badge ${tone}`}>{children}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`admin-tab ${value === tab.value ? "active" : ""}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="admin-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
