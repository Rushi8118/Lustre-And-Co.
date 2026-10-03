import { createContext, useContext, useEffect, useState } from "react";

const AdminThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
});

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_theme");
      if (saved === "dark" || saved === "light") return saved;
      return "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_theme", theme);
    } catch {}

    if (theme === "dark") {
      document.documentElement.classList.add("admin-dark");
      document.documentElement.classList.remove("admin-light");
    } else {
      document.documentElement.classList.add("admin-light");
      document.documentElement.classList.remove("admin-dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <AdminThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === "dark",
      }}
    >
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
}

export default AdminThemeContext;
