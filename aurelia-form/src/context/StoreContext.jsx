import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { PRODUCTS } from "../data/products";
import { readStorage, writeStorage } from "../lib/helpers";

const BAG_KEY = "aurelia-form-bag";
const WISHLIST_KEY = "aurelia-form-wishlist";

const StoreContext = createContext(null);

/** A bag line is identified by product, finish and size, so the same ring in two finishes stays separate. */
function lineKey(line) {
  return `${line.id}|${line.finish}|${line.size || ""}`;
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const key = lineKey(action.line);
      const existing = state.bag.find((line) => lineKey(line) === key);
      const bag = existing
        ? state.bag.map((line) => (lineKey(line) === key ? { ...line, qty: Math.min(line.qty + action.line.qty, 5) } : line))
        : [...state.bag, action.line];
      return { ...state, bag };
    }
    case "setQty": {
      const bag = state.bag
        .map((line) => (lineKey(line) === action.key ? { ...line, qty: action.qty } : line))
        .filter((line) => line.qty > 0);
      return { ...state, bag };
    }
    case "remove":
      return { ...state, bag: state.bag.filter((line) => lineKey(line) !== action.key) };
    case "toggleWish": {
      const wishlist = state.wishlist.includes(action.id)
        ? state.wishlist.filter((id) => id !== action.id)
        : [...state.wishlist, action.id];
      return { ...state, wishlist };
    }
    case "clearBag":
      return { ...state, bag: [] };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    bag: readStorage(BAG_KEY, []),
    wishlist: readStorage(WISHLIST_KEY, []),
  }));

  useEffect(() => writeStorage(BAG_KEY, state.bag), [state.bag]);
  useEffect(() => writeStorage(WISHLIST_KEY, state.wishlist), [state.wishlist]);

  const addToBag = useCallback(
    (product, { finish, size = "", qty = 1 }) => dispatch({ type: "add", line: { id: product.id, finish, size, qty } }),
    []
  );
  const setQty = useCallback((key, qty) => dispatch({ type: "setQty", key, qty }), []);
  const removeLine = useCallback((key) => dispatch({ type: "remove", key }), []);
  const toggleWish = useCallback((id) => dispatch({ type: "toggleWish", id }), []);

  const value = useMemo(() => {
    const bagLines = state.bag
      .map((line) => {
        const product = PRODUCTS.find((item) => item.id === line.id);
        return product ? { ...line, key: lineKey(line), product } : null;
      })
      .filter(Boolean);
    const count = bagLines.reduce((total, line) => total + line.qty, 0);
    const subtotal = bagLines.reduce((total, line) => total + line.qty * line.product.price, 0);
    const wishlistProducts = state.wishlist.map((id) => PRODUCTS.find((item) => item.id === id)).filter(Boolean);
    return {
      bagLines,
      count,
      subtotal,
      wishlistIds: state.wishlist,
      wishlistProducts,
      isWished: (id) => state.wishlist.includes(id),
      addToBag,
      setQty,
      removeLine,
      toggleWish,
      clearBag: () => dispatch({ type: "clearBag" }),
    };
  }, [state, addToBag, setQty, removeLine, toggleWish]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
