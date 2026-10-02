import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Link } from "react-router-dom";
import api, { TOKEN_KEY, getErrorMessage } from "../services/api";
import { cartItemId, formatPrice, normalizeProduct } from "../data/products";
import { useSettings } from "./SettingsContext";

const StoreContext = createContext(null);

const USER_KEY = "lustre-user";
const GUEST_CART_KEY = "lustre-cart";
const GUEST_WISHLIST_KEY = "lustre-wishlist";
const PROMO_KEY = "lustre-promo";
const LAST_ORDER_KEY = "lustre-last-order";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the app still works in memory.
  }
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const fromServerCart = (data) =>
  (data?.items || []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    selectedColor: item.selectedColor,
    selectedSize: item.selectedSize,
    product: normalizeProduct(item.product)
  }));

const toGuestLine = (item) => ({
  id: item.id,
  slug: item.product.slug,
  quantity: item.quantity,
  selectedColor: item.selectedColor,
  selectedSize: item.selectedSize
});

function stockError(product, quantity) {
  const stock = product?.stockQuantity ?? Infinity;
  if (quantity <= stock) return null;
  const error = new Error("Not enough stock");
  error.userMessage =
    stock > 0 ? `Only ${stock} of "${product.name}" left in stock.` : `"${product.name}" is out of stock.`;
  return error;
}

export function StoreProvider({ children }) {
  const { commerce } = useSettings();

  const [products, setProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState("loading");
  const [user, setUser] = useState(() => (readToken() ? readStorage(USER_KEY, null) : null));
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(() => readStorage(PROMO_KEY, null));
  const [lastOrder, setLastOrder] = useState(() => readStorage(LAST_ORDER_KEY, null));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((payload, type = "default") => {
    const toastData =
      typeof payload === "string" ? { message: payload, type } : { type, ...payload };
    setToast(toastData);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------

  const refreshProducts = useCallback(async () => {
    try {
      const pageSize = 200;
      const first = await api.get("/products", { params: { limit: pageSize, page: 1 } });
      let items = first.data.items;
      for (let page = 2; page <= (first.data.totalPages || 1); page++) {
        const next = await api.get("/products", { params: { limit: pageSize, page } });
        items = items.concat(next.data.items);
      }
      setProducts(items.map(normalizeProduct));
      setProductsStatus("ready");
    } catch {
      setProductsStatus((current) => (current === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------

  const loadAccountCollections = useCallback(async () => {
    const [cartRes, wishlistRes] = await Promise.all([api.get("/cart"), api.get("/wishlist")]);
    setCart(fromServerCart(cartRes.data));
    setWishlist((wishlistRes.data || []).map(normalizeProduct));
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    writeStorage(USER_KEY, null);
    setUser(null);
    setCart([]);
    setWishlist([]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!readToken()) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (cancelled) return;
        setUser(data.user);
        writeStorage(USER_KEY, data.user);
        await loadAccountCollections();
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [clearSession, loadAccountCollections]);

  useEffect(() => {
    function handleExpired() {
      clearSession();
      showToast("Your session has ended. Please sign in again.", "error");
    }
    window.addEventListener("lustre:session-expired", handleExpired);
    return () => window.removeEventListener("lustre:session-expired", handleExpired);
  }, [clearSession, showToast]);

  // Guests keep their bag and wishlist in local storage, re-priced from the live catalog.
  useEffect(() => {
    if (!authReady || user || productsStatus !== "ready") return;
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const lines = readStorage(GUEST_CART_KEY, []);
    setCart(
      lines
        .filter((line) => bySlug.has(line.slug))
        .map((line) => ({ ...line, product: bySlug.get(line.slug) }))
    );
    setWishlist(readStorage(GUEST_WISHLIST_KEY, []).map((slug) => bySlug.get(slug)).filter(Boolean));
  }, [authReady, user, productsStatus, products]);

  useEffect(() => {
    if (authReady && !user && productsStatus === "ready") {
      writeStorage(GUEST_CART_KEY, cart.map(toGuestLine));
      writeStorage(GUEST_WISHLIST_KEY, wishlist.map((p) => p.slug));
    }
  }, [cart, wishlist, user, authReady, productsStatus]);

  const completeSignIn = useCallback(async (data) => {
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
    } catch {
      // ignore
    }
    writeStorage(USER_KEY, data.user);
    setUser(data.user);

    const guestLines = readStorage(GUEST_CART_KEY, []);
    const guestWishlist = readStorage(GUEST_WISHLIST_KEY, []);

    try {
      const cartRes = guestLines.length
        ? await api.post("/cart/sync", {
            items: guestLines.map((line) => ({
              productId: line.slug,
              quantity: line.quantity,
              selectedColor: line.selectedColor,
              selectedSize: line.selectedSize
            }))
          })
        : await api.get("/cart");
      setCart(fromServerCart(cartRes.data));

      let serverWishlist = (await api.get("/wishlist")).data || [];
      const saved = new Set(serverWishlist.map((p) => p.slug));
      for (const slug of guestWishlist) {
        if (saved.has(slug)) continue;
        try {
          serverWishlist = (await api.post(`/wishlist/${slug}`)).data.wishlist;
        } catch {
          // Product no longer exists; skip it.
        }
      }
      setWishlist(serverWishlist.map(normalizeProduct));

      writeStorage(GUEST_CART_KEY, null);
      writeStorage(GUEST_WISHLIST_KEY, null);
    } catch {
      // The account is signed in even if merging fails; the bag reloads on next visit.
    }
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const { data } = await api.post("/auth/login", { email, password });
      await completeSignIn(data);
      showToast(`Welcome back, ${data.user.name.split(" ")[0]}.`, "success");
      return data.user;
    },
    [completeSignIn, showToast]
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      const { data } = await api.post("/auth/register", { name, email, password });
      await completeSignIn(data);
      showToast("Your account is ready.", "success");
      return data.user;
    },
    [completeSignIn, showToast]
  );

  const logout = useCallback(() => {
    clearSession();
    showToast("You have been signed out.");
  }, [clearSession, showToast]);

  const updateUser = useCallback((patch) => {
    setUser((current) => {
      const next = current ? { ...current, ...patch } : current;
      writeStorage(USER_KEY, next);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Bag
  // ---------------------------------------------------------------------------

  const addToCart = useCallback(
    async (product, quantity = 1) => {
      const selectedColor = product.selectedColor || product.availableColors?.[0] || "Gold";
      const selectedSize = product.selectedSize || product.availableSizes?.[0] || "Standard";

      try {
        if (user) {
          const { data } = await api.post("/cart/items", {
            productId: product.slug,
            quantity,
            selectedColor,
            selectedSize
          });
          setCart(fromServerCart(data));
        } else {
          const catalogProduct = products.find((p) => p.slug === product.slug) || normalizeProduct(product);
          const id = cartItemId(product.slug, selectedColor, selectedSize);
          const existing = cart.find((item) => item.id === id);
          const error = stockError(catalogProduct, (existing?.quantity || 0) + quantity);
          if (error) throw error;

          setCart(
            existing
              ? cart.map((item) => (item.id === id ? { ...item, quantity: item.quantity + quantity } : item))
              : [...cart, { id, quantity, selectedColor, selectedSize, product: catalogProduct }]
          );
        }

        showToast({
          title: "Added to Bag",
          message: product.name,
          product,
          type: "success",
          actionText: "View Bag",
          actionLink: "/cart"
        });
        return true;
      } catch (err) {
        showToast(getErrorMessage(err, "Could not add this piece to your bag."), "error");
        return false;
      }
    },
    [user, products, cart, showToast]
  );

  const updateQuantity = useCallback(
    async (id, quantity) => {
      if (quantity < 1) return;
      try {
        if (user) {
          const { data } = await api.patch(`/cart/items/${encodeURIComponent(id)}`, { quantity });
          setCart(fromServerCart(data));
        } else {
          const item = cart.find((line) => line.id === id);
          const error = stockError(item?.product, quantity);
          if (error) throw error;
          setCart(cart.map((line) => (line.id === id ? { ...line, quantity } : line)));
        }
      } catch (err) {
        showToast(getErrorMessage(err, "Could not update the quantity."), "error");
      }
    },
    [user, cart, showToast]
  );

  const removeFromCart = useCallback(
    async (id, { silent = false } = {}) => {
      try {
        if (user) {
          const { data } = await api.delete(`/cart/items/${encodeURIComponent(id)}`);
          setCart(fromServerCart(data));
        } else {
          setCart((current) => current.filter((item) => item.id !== id));
        }
        if (!silent) showToast("Item removed from your bag.");
      } catch (err) {
        showToast(getErrorMessage(err, "Could not remove this item."), "error");
      }
    },
    [user, showToast]
  );

  const clearCart = useCallback(async () => {
    setCart([]);
    if (user) {
      try {
        await api.delete("/cart");
      } catch {
        // ignore; the server also clears the bag when an order is placed
      }
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // Wishlist
  // ---------------------------------------------------------------------------

  const isWishlisted = useCallback(
    (id) => wishlist.some((item) => item.id === id || item.slug === id),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (product) => {
      try {
        if (user) {
          const { data } = await api.post(`/wishlist/${product.slug}`);
          setWishlist((data.wishlist || []).map(normalizeProduct));
          showToast(data.inWishlist ? "Added to your wishlist." : "Removed from your wishlist.");
        } else {
          const exists = wishlist.some((item) => item.slug === product.slug);
          const catalogProduct = products.find((p) => p.slug === product.slug) || normalizeProduct(product);
          setWishlist(
            exists ? wishlist.filter((item) => item.slug !== product.slug) : [...wishlist, catalogProduct]
          );
          showToast(exists ? "Removed from your wishlist." : "Added to your wishlist.");
        }
      } catch (err) {
        showToast(getErrorMessage(err, "Could not update your wishlist."), "error");
      }
    },
    [user, wishlist, products, showToast]
  );

  const moveToWishlist = useCallback(
    async (item) => {
      const product = item.product;
      if (!isWishlisted(product.slug)) {
        await toggleWishlist(product);
      }
      await removeFromCart(item.id, { silent: true });
      showToast({
        title: "Moved to Wishlist",
        message: `${product.name} has been moved to your wishlist.`,
        type: "success",
        actionText: "View Wishlist",
        actionLink: "/wishlist"
      });
    },
    [isWishlisted, toggleWishlist, removeFromCart, showToast]
  );

  // ---------------------------------------------------------------------------
  // Totals (mirror the server's order calculation)
  // ---------------------------------------------------------------------------

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === "percentage") return Math.round(cartSubtotal * appliedPromo.rate);
    if (appliedPromo.type === "fixed") return Math.min(cartSubtotal, appliedPromo.rate);
    return 0;
  }, [appliedPromo, cartSubtotal]);

  const shipping = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (cartSubtotal >= commerce.freeShippingThreshold || appliedPromo?.freeShipping) return 0;
    return commerce.shippingFee;
  }, [cartSubtotal, appliedPromo, commerce]);

  const estimatedTax = useMemo(
    () => Math.round((Math.max(0, cartSubtotal - discountAmount) * commerce.taxPercent) / 100),
    [cartSubtotal, discountAmount, commerce]
  );

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - discountAmount) + shipping + estimatedTax,
    [cartSubtotal, discountAmount, shipping, estimatedTax]
  );

  // ---------------------------------------------------------------------------
  // Promo codes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    writeStorage(PROMO_KEY, appliedPromo);
  }, [appliedPromo]);

  // Drop a promo that no longer qualifies (e.g. the bag fell below the minimum).
  useEffect(() => {
    if (!appliedPromo || cart.length === 0 || productsStatus !== "ready") return;
    if (cartSubtotal < (appliedPromo.minOrderAmount || 0)) {
      setAppliedPromo(null);
      showToast(
        `Promo ${appliedPromo.code} was removed — it requires a subtotal of ${formatPrice(appliedPromo.minOrderAmount)}.`,
        "error"
      );
    }
  }, [appliedPromo, cart.length, cartSubtotal, productsStatus, showToast]);

  const applyPromoCode = useCallback(
    async (code) => {
      const normalized = (code || "").trim().toUpperCase();
      if (!normalized) {
        return { success: false, message: "Please enter a promo code." };
      }
      try {
        const { data } = await api.post("/discounts/validate", { code: normalized, subtotal: cartSubtotal });
        const promo = {
          code: data.code,
          type: data.type,
          rate: data.rate,
          freeShipping: Boolean(data.freeShipping),
          minOrderAmount: data.minOrderAmount || 0,
          label: data.label
        };
        setAppliedPromo(promo);
        showToast(data.message || `Promo code ${data.code} applied!`, "success");
        return { success: true, message: data.message, promo };
      } catch (err) {
        const message = getErrorMessage(err, "Invalid or expired promo code.");
        return { success: false, message };
      }
    },
    [cartSubtotal, showToast]
  );

  const removePromoCode = useCallback(() => {
    setAppliedPromo(null);
    showToast("Promo code removed.");
  }, [showToast]);

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  const placeOrder = useCallback(
    async ({ customer, shippingAddress, deliveryOption, paymentMethod, notes }) => {
      const { data } = await api.post("/orders", {
        customer,
        shippingAddress,
        items: cart.map((item) => ({
          productId: item.product.slug,
          quantity: item.quantity,
          color: item.selectedColor,
          size: item.selectedSize
        })),
        deliveryOption,
        paymentMethod,
        notes: notes || undefined,
        promoCode: appliedPromo?.code
      });

      setLastOrder(data);
      // Only the reference is persisted, so order details are not left in browser storage.
      writeStorage(LAST_ORDER_KEY, { orderId: data.orderId, email: data.customer?.email });
      setCart([]);
      if (!user) writeStorage(GUEST_CART_KEY, []);
      setAppliedPromo(null);
      refreshProducts();
      return data;
    },
    [cart, appliedPromo, user, refreshProducts]
  );

  const value = useMemo(
    () => ({
      products,
      productsStatus,
      refreshProducts,
      cart,
      wishlist,
      user,
      authReady,
      lastOrder,
      setLastOrder,
      toast,
      cartCount,
      cartSubtotal,
      appliedPromo,
      discountAmount,
      shipping,
      estimatedTax,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      moveToWishlist,
      clearCart,
      toggleWishlist,
      isWishlisted,
      applyPromoCode,
      removePromoCode,
      login,
      register,
      logout,
      updateUser,
      placeOrder,
      showToast
    }),
    [
      products,
      productsStatus,
      refreshProducts,
      cart,
      wishlist,
      user,
      authReady,
      lastOrder,
      toast,
      cartCount,
      cartSubtotal,
      appliedPromo,
      discountAmount,
      shipping,
      estimatedTax,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      moveToWishlist,
      clearCart,
      toggleWishlist,
      isWishlisted,
      applyPromoCode,
      removePromoCode,
      login,
      register,
      logout,
      updateUser,
      placeOrder,
      showToast
    ]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}

      {toast && (
        <div
          className={`toast toast-${toast.type || "default"} ${toast.product ? "toast-rich" : ""}`}
          role="status"
        >
          {toast.product ? (
            <div className="toast-rich-inner">
              <img src={toast.product.image} alt="" className="toast-thumbnail" />
              <div className="toast-rich-body">
                <span className="toast-headline">{toast.title || "Added to Bag"}</span>
                <strong className="toast-product-name">{toast.message}</strong>
                <span className="toast-product-price">{formatPrice(toast.product.price)}</span>
              </div>
              {toast.actionLink && (
                <Link to={toast.actionLink} className="toast-cta-btn" onClick={() => setToast(null)}>
                  {toast.actionText || "View Bag"}
                </Link>
              )}
              <button
                type="button"
                className="toast-dismiss-btn"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="toast-standard-inner">
              <span className="toast-mark">✦</span>
              <span className="toast-standard-text">{toast.message}</span>
              <button
                type="button"
                className="toast-dismiss-btn"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          <div className="toast-progress-bar" />
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return context;
}
