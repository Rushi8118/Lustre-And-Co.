import React, { useState } from "react";
import { Ruler, Sparkles, X, Check, HelpCircle, Info } from "lucide-react";

const RING_SIZES = [
  { indian: "6", us: "3.75", diameterMm: "14.7", circumferenceMm: "46.2" },
  { indian: "7", us: "4.25", diameterMm: "15.0", circumferenceMm: "47.1" },
  { indian: "8", us: "4.5", diameterMm: "15.3", circumferenceMm: "48.1" },
  { indian: "9", us: "5.0", diameterMm: "15.6", circumferenceMm: "49.0" },
  { indian: "10", us: "5.5", diameterMm: "16.0", circumferenceMm: "50.3" },
  { indian: "11", us: "5.75", diameterMm: "16.3", circumferenceMm: "51.2" },
  { indian: "12", us: "6.0", diameterMm: "16.5", circumferenceMm: "51.9" },
  { indian: "13", us: "6.5", diameterMm: "16.9", circumferenceMm: "53.1" },
  { indian: "14", us: "7.0", diameterMm: "17.3", circumferenceMm: "54.4" },
  { indian: "15", us: "7.25", diameterMm: "17.5", circumferenceMm: "55.0" },
  { indian: "16", us: "7.75", diameterMm: "18.0", circumferenceMm: "56.5" },
  { indian: "17", us: "8.0", diameterMm: "18.2", circumferenceMm: "57.2" },
  { indian: "18", us: "8.5", diameterMm: "18.5", circumferenceMm: "58.1" },
  { indian: "19", us: "8.75", diameterMm: "18.8", circumferenceMm: "59.1" },
  { indian: "20", us: "9.25", diameterMm: "19.2", circumferenceMm: "60.3" },
];

const BANGLE_SIZES = [
  { size: "2-2 (Small)", diameterInches: "2.125", diameterMm: "54.0", wristCm: "15 - 16 cm" },
  { size: "2-4 (Medium)", diameterInches: "2.25", diameterMm: "57.2", wristCm: "16.5 - 17.5 cm" },
  { size: "2-6 (Standard)", diameterInches: "2.375", diameterMm: "60.3", wristCm: "18 - 19 cm" },
  { size: "2-8 (Large)", diameterInches: "2.50", diameterMm: "63.5", wristCm: "19.5 - 20.5 cm" },
];

const NECKLACE_LENGTHS = [
  { name: "Choker", lengthInches: "14\" – 16\"", lengthCm: "35 – 40 cm", position: "Snug around the base of the neck" },
  { name: "Princess (Most Popular)", lengthInches: "17\" – 19\"", lengthCm: "43 – 48 cm", position: "Sits gracefully along the collarbone" },
  { name: "Matinee", lengthInches: "20\" – 24\"", lengthCm: "50 – 60 cm", position: "Rests comfortably at the top of the bust" },
  { name: "Opera", lengthInches: "28\" – 34\"", lengthCm: "70 – 85 cm", position: "Below the bustline, perfect for evening wear & layering" },
];

export default function SizeGuideModal({ isOpen, onClose, category = "rings", onSelectSize }) {
  const [activeTab, setActiveTab] = useState(
    category.toLowerCase().includes("bangle") || category.toLowerCase().includes("bracelet")
      ? "bangles"
      : category.toLowerCase().includes("necklace") || category.toLowerCase().includes("pendant")
      ? "necklaces"
      : "rings"
  );

  const [measuredMm, setMeasuredMm] = useState("");
  const [recommendedSize, setRecommendedSize] = useState(null);

  if (!isOpen) return null;

  function calculateRingRecommendation(val) {
    setMeasuredMm(val);
    const num = parseFloat(val);
    if (!num || num < 40 || num > 75) {
      setRecommendedSize(null);
      return;
    }

    // Find closest circumference
    let closest = RING_SIZES[0];
    let minDiff = Math.abs(parseFloat(RING_SIZES[0].circumferenceMm) - num);

    for (const size of RING_SIZES) {
      const diff = Math.abs(parseFloat(size.circumferenceMm) - num);
      if (diff < minDiff) {
        minDiff = diff;
        closest = size;
      }
    }

    setRecommendedSize(closest);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(28, 25, 23, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "28px",
          position: "relative",
          border: "1px solid #ebd9c0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--gold, #d4af37)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              <Ruler size={14} /> Size &amp; Fit Guide
            </div>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "24px", margin: "4px 0 0 0", color: "#1c1917" }}>
              Find Your Perfect Fit
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#78716c" }}>
              Crafted to sit comfortably and effortlessly. Use our measurement charts or interactive fit assistant.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f5f5f4",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#57534e",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid #e7e5e4", marginBottom: "20px", gap: "8px" }}>
          {[
            { id: "rings", label: "Ring Sizing" },
            { id: "bangles", label: "Bangles & Bracelets" },
            { id: "necklaces", label: "Necklace Lengths" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? "600" : "500",
                color: activeTab === tab.id ? "#1c1917" : "#78716c",
                borderBottom: activeTab === tab.id ? "2px solid #d4af37" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ring Sizing View */}
        {activeTab === "rings" && (
          <div>
            {/* Interactive Calculator */}
            <div
              style={{
                background: "linear-gradient(135deg, #fbf7ee 0%, #fffbf2 100%)",
                border: "1px solid #ebd9c0",
                borderRadius: "12px",
                padding: "18px 20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Sparkles size={16} color="#d4af37" />
                <strong style={{ fontSize: "14px", color: "#1c1917" }}>Smart Ring Fit Calculator</strong>
              </div>
              <p style={{ fontSize: "12px", color: "#57534e", margin: "0 0 12px 0" }}>
                Wrap a strip of paper around your finger joint, mark the overlap point, and measure the length in millimetres (mm):
              </p>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 54.4"
                    value={measuredMm}
                    onChange={(e) => calculateRingRecommendation(e.target.value)}
                    style={{
                      padding: "8px 36px 8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #d6d3d1",
                      fontSize: "14px",
                      width: "140px",
                    }}
                  />
                  <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#78716c" }}>
                    mm
                  </span>
                </div>

                {recommendedSize && (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #d4af37",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Check size={16} color="#16a34a" />
                    <span style={{ fontSize: "13px", color: "#1c1917" }}>
                      Recommended: <strong>Indian Size {recommendedSize.indian}</strong> (US {recommendedSize.us})
                    </span>
                    {onSelectSize && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSize(recommendedSize.indian);
                          onClose();
                        }}
                        style={{
                          background: "#1c1917",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Apply Size
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f5f5f4", borderBottom: "1px solid #e7e5e4" }}>
                    <th style={{ padding: "8px 12px" }}>Indian Size</th>
                    <th style={{ padding: "8px 12px" }}>US Size</th>
                    <th style={{ padding: "8px 12px" }}>Inside Diameter (mm)</th>
                    <th style={{ padding: "8px 12px" }}>Circumference (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {RING_SIZES.map((row) => (
                    <tr key={row.indian} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "8px 12px", fontWeight: "600" }}>{row.indian}</td>
                      <td style={{ padding: "8px 12px" }}>{row.us}</td>
                      <td style={{ padding: "8px 12px", color: "#78716c" }}>{row.diameterMm} mm</td>
                      <td style={{ padding: "8px 12px", color: "#78716c" }}>{row.circumferenceMm} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bangles View */}
        {activeTab === "bangles" && (
          <div>
            <p style={{ fontSize: "13px", color: "#57534e", marginBottom: "14px" }}>
              Bangle size is determined by the inner diameter. Measure the widest part of your hand across the knuckles while holding fingers together:
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f5f5f4", borderBottom: "1px solid #e7e5e4" }}>
                  <th style={{ padding: "10px 12px" }}>Indian Bangle Size</th>
                  <th style={{ padding: "10px 12px" }}>Inner Diameter (Inches)</th>
                  <th style={{ padding: "10px 12px" }}>Inner Diameter (mm)</th>
                  <th style={{ padding: "10px 12px" }}>Suggested Wrist Fit</th>
                </tr>
              </thead>
              <tbody>
                {BANGLE_SIZES.map((row) => (
                  <tr key={row.size} style={{ borderBottom: "1px solid #f5f5f4" }}>
                    <td style={{ padding: "10px 12px", fontWeight: "600" }}>{row.size}</td>
                    <td style={{ padding: "10px 12px" }}>{row.diameterInches}&quot;</td>
                    <td style={{ padding: "10px 12px", color: "#78716c" }}>{row.diameterMm} mm</td>
                    <td style={{ padding: "10px 12px", color: "#16a34a", fontWeight: "500" }}>{row.wristCm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Necklaces View */}
        {activeTab === "necklaces" && (
          <div>
            <p style={{ fontSize: "13px", color: "#57534e", marginBottom: "14px" }}>
              Standard necklace draping reference for styling and layered looks:
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              {NECKLACE_LENGTHS.map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #e7e5e4",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>{item.name}</strong>
                    <span style={{ fontSize: "12px", color: "#78716c" }}>{item.position}</span>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#d4af37", background: "#fbf7ee", padding: "4px 10px", borderRadius: "6px" }}>
                    {item.lengthInches} ({item.lengthCm})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e7e5e4", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#78716c" }}>
          <Info size={15} />
          <span>Need custom sizing or assistance? Contact our concierge team via WhatsApp for tailored measurements.</span>
        </div>
      </div>
    </div>
  );
}
