import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Heart, Home, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { useStore } from "../context/StoreContext";

export default function BottomNav() {
  const { cartCount, wishlist, user } = useStore();
  const location = useLocation();

  const currentPathWithSearch = location.pathname + location.search;
  const isAuthPage = location.pathname.startsWith("/account/login") || location.pathname.startsWith("/account/signup");
  const accountTo = user
    ? "/account"
    : isAuthPage
    ? "/account/login"
    : `/account/login?redirect=${encodeURIComponent(currentPathWithSearch)}`;
  const accountState = !user && !isAuthPage ? { from: currentPathWithSearch } : undefined;

  const navItems = [
    {
      label: "Home",
      to: "/",
      icon: Home,
      end: true
    },
    {
      label: "Shop",
      to: "/shop",
      icon: Sparkles
    },
    {
      label: "Wishlist",
      to: "/wishlist",
      icon: Heart,
      badge: wishlist?.length > 0 ? wishlist.length : null
    },
    {
      label: "Bag",
      to: "/cart",
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : null
    },
    {
      label: "Account",
      to: accountTo,
      state: accountState,
      icon: UserRound
    }
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Bottom Navigation"
      role="navigation"
    >
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              state={item.state}
              end={item.end}
              className={({ isActive }) =>
                `bottom-nav-item ${isActive ? "is-active" : ""}`
              }
              aria-label={
                item.badge
                  ? `${item.label} (${item.badge} items)`
                  : item.label
              }
            >
              <div className="bottom-nav-icon-wrap">
                <Icon size={20} className="bottom-nav-icon" />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="bottom-nav-badge" aria-hidden="true">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
