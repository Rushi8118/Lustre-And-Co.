import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Bespoke luxury dropdown component for Lustre & Co. admin studio.
 * Supports options array or <option> children, smooth animated popover,
 * keyboard accessibility, and light/dark theme styling.
 */
export default function AdminDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  className = "",
  size = "md", // "sm", "md", "lg"
  disabled = false,
  ariaLabel,
  icon: Icon,
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse options from either `options` prop or JSX `<option>` children
  let parsedOptions = [...options];
  if (!parsedOptions.length && children) {
    const childArr = Array.isArray(children) ? children : [children];
    childArr.forEach((child) => {
      if (child && child.props) {
        parsedOptions.push({
          value: child.props.value,
          label: child.props.children || String(child.props.value),
        });
      }
    });
  }

  // Determine active selected option
  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value ?? opt) === String(value)
  );

  const displayLabel = selectedOption
    ? selectedOption.label ?? selectedOption
    : placeholder;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation & accessibility
  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = parsedOptions.findIndex(
          (opt) => String(opt.value ?? opt) === String(value)
        );
        const nextIndex = Math.min(currentIndex + 1, parsedOptions.length - 1);
        const nextOpt = parsedOptions[nextIndex];
        if (nextOpt) onChange?.(nextOpt.value ?? nextOpt);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = parsedOptions.findIndex(
          (opt) => String(opt.value ?? opt) === String(value)
        );
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevOpt = parsedOptions[prevIndex];
        if (prevOpt) onChange?.(prevOpt.value ?? prevOpt);
      }
    }
  }

  function handleSelect(opt) {
    const val = opt.value !== undefined ? opt.value : opt;
    onChange?.(val);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`admin-custom-dropdown ${size} ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`}
    >
      <button
        type="button"
        className="admin-dropdown-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
      >
        {Icon && <Icon size={14} className="dropdown-leading-icon" />}
        <span className="dropdown-label">{displayLabel}</span>
        <span className="dropdown-chevron-badge" aria-hidden="true">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="dropdown-chevron-svg"
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="admin-dropdown-menu" role="listbox">
          <div className="admin-dropdown-scroll">
            {parsedOptions.map((opt, idx) => {
              const optVal = opt.value !== undefined ? opt.value : opt;
              const optLabel = opt.label !== undefined ? opt.label : opt;
              const isSelected = String(optVal) === String(value);

              return (
                <button
                  key={String(optVal) + idx}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`admin-dropdown-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="dropdown-item-label">{optLabel}</span>
                  {isSelected && <Check size={14} className="dropdown-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
