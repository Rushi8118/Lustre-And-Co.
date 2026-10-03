import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * "View in your space": asks for the camera and shows it behind the piece. Placement and
 * scale are not modelled yet; the panel is a clear preview of the camera feed, and it says so.
 */
export default function ArPreview({ open, onClose }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [status, setStatus] = useState("idle");
  // Keep the latest close handler in a ref, so the camera is not re-requested on every render.
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    let stream = null;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
    } else {
      setStatus("asking");
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((media) => {
          if (cancelled) {
            media.getTracks().forEach((track) => track.stop());
            return;
          }
          stream = media;
          if (videoRef.current) videoRef.current.srcObject = media;
          setStatus("live");
        })
        .catch(() => !cancelled && setStatus("denied"));
    }

    closeRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && closeHandler.current();
    document.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!open) return null;

  const message = {
    asking: "Waiting for camera permission…",
    denied: "Camera access was not allowed. You can allow it in your browser settings and try again.",
    unsupported: "This browser cannot open a camera. Try again on a phone or a laptop with a camera.",
  }[status];

  return (
    <div className="ar-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ar-panel" role="dialog" aria-modal="true" aria-labelledby="ar-title">
        <div className="ar-head">
          <h2 id="ar-title">View in your space</h2>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close preview">
            <X size={18} />
          </button>
        </div>
        <div className="ar-frame">
          <video ref={videoRef} autoPlay playsInline muted aria-label="Camera preview" hidden={status !== "live"} />
          {status !== "live" && <p className="ar-message">{message}</p>}
        </div>
        <p className="ar-note">
          This is a camera preview. Placing the piece on your hand at true scale needs a dedicated AR model, which is not built yet.
        </p>
      </div>
    </div>
  );
}
