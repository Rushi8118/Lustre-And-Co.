import { useEffect } from "react";
import { X } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";

export default function AdminModal({
  open,
  isOpen,
  title,
  description,
  subtitle,
  onClose,
  children,
  footer,
  wide = false
}) {
  const visible = open ?? isOpen;
  const { settings } = useSettings();

  useEffect(() => {
    if (!visible) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const text = description ?? subtitle;

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div
        className={`admin-modal ${wide ? "is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-eyebrow">{settings.store.name} admin</span>
            <h2>{title}</h2>
            {text && <p>{text}</p>}
          </div>

          <button className="admin-modal-close" onClick={onClose} aria-label="Close dialog" type="button">
            <X size={19} />
          </button>
        </div>

        <div className="admin-modal-body">{children}</div>

        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
