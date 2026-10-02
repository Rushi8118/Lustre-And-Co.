import { Minus, Plus } from "lucide-react";

export default function QuantityControl({ quantity, onChange }) {
  return (
    <div className="quantity-control">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>

      <span>{quantity}</span>

      <button
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}