import { useMemo, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Heart, LockKeyhole, Mail, Sparkles, UserRound, Github } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../context/StoreContext";
import { useSettings } from "../context/SettingsContext";
import { getErrorMessage } from "../services/api";

/** The API lives on its own origin, so Google sign-in is a full page navigation to it. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const benefits = ["Save your favorite pieces", "Track orders effortlessly", "Enjoy a faster checkout"];

function getPasswordStrength(password) {
  if (!password) return { label: "", level: 0, className: "" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak password", level: 1, className: "weak" };
  if (score === 2) return { label: "Fair password", level: 2, className: "fair" };
  if (score === 3) return { label: "Good password", level: 3, className: "good" };
  return { label: "Strong password", level: 4, className: "strong" };
}

function FloatingJewelryScene() {
  return (
    <div className="auth-visual-scene" aria-hidden="true">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <motion.div className="auth-orbit auth-orbit-one" animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} />
      <motion.div className="auth-orbit auth-orbit-two" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      <motion.div className="auth-floating-pearl pearl-one" animate={{ y: [0, -15, 0], rotate: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="auth-floating-pearl pearl-two" animate={{ y: [0, 18, 0], rotate: [0, -18, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.7 }} />
      <motion.div className="auth-floating-pearl pearl-three" animate={{ y: [0, -10, 0], x: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} />
      <motion.div className="auth-jewelry-card" animate={{ y: [0, -8, 0], rotateZ: [-2, 2, -2] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <div className="auth-card-shine" />
        <div className="auth-card-chain auth-chain-one" />
        <div className="auth-card-chain auth-chain-two" />
        <div className="auth-card-jewel">
          <div className="auth-card-jewel-core" />
        </div>
        <div className="auth-card-label">
          <span>THE EDIT</span>
          <strong>Made to shine.</strong>
        </div>
      </motion.div>
      <div className="auth-scene-caption">
        <Sparkles size={16} />
        <span>Everyday elegance, made personal.</span>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, onBlur, placeholder, icon: Icon, error, autoComplete, children }) {
  return (
    <label className={`auth-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      <div className="auth-input-wrap">
        {Icon && <Icon size={17} className="auth-input-icon" />}
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {children}
      </div>
      {error && <small className="auth-field-error">{error}</small>}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.87 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.597 0 .957 4.958.957 9s3.64 8.958 8.043 8.958c1.943 0 3.61-.638 5.025-1.74l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18c2.43 0 4.467-.806 5.956-2.18l-2.582-2.58C13.463 11.404 11.426 10 9 10c-1.321 0-2.508.454-3.44 1.345l-2.582-2.58A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332A5.41 5.41 0 019 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function Auth({ mode = "login" }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register } = useStore();
  const { settings } = useSettings();
  const storeName = settings.store.name;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(() => searchParams.get("error") || "");
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const googleEnabled = settings.auth?.googleEnabled;
  const [touched, setTouched] = useState({});

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const errors = useMemo(() => {
    const next = {};
    if (!isLogin && !form.name.trim()) next.name = "Please enter your name.";
    if (!form.email.trim()) next.email = "Please enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Please enter a valid email address.";
    if (!form.password) next.password = "Please enter your password.";
    else if (!isLogin && form.password.length < 8) next.password = "Use at least 8 characters.";
    if (!isLogin && form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    return next;
  }, [form, isLogin]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  }

  const markTouched = (field) => () => setTouched((current) => ({ ...current, [field]: true }));

  async function submit(event) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (Object.keys(errors).length > 0) {
      setFormError("Please review the highlighted fields.");
      return;
    }
    if (!isLogin && !agreed) {
      setFormError("Please accept the Terms and Privacy Policy to create an account.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signedIn = isLogin
        ? await login({ email: form.email.trim(), password: form.password })
        : await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });

      const fallback = signedIn.role === "admin" ? "/admin" : "/account";
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, "Authentication failed. Please check your details."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page-background">
        <span className="auth-bg-shape auth-bg-shape-one" />
        <span className="auth-bg-shape auth-bg-shape-two" />
        <span className="auth-bg-shape auth-bg-shape-three" />
      </div>

      <section className="auth-layout">
        <motion.div
          className="auth-brand-panel"
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <Link to="/" className="auth-logo">
            {storeName}
          </Link>

          <div className="auth-brand-copy">
            <span className="auth-kicker">
              <Sparkles size={14} />
              Your account
            </span>
            <h1>
              Your style,
              <br />
              <em>your shine.</em>
            </h1>
            <p>Save the pieces you love, follow every order, and check out faster.</p>
            <div className="auth-benefit-list">
              {benefits.map((benefit) => (
                <div key={benefit}>
                  <span>
                    <Check size={13} />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <FloatingJewelryScene />

          <div className="auth-brand-footer">
            <span>
              © {new Date().getFullYear()} {storeName}
            </span>
            <span>{settings.store.tagline}</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-form-panel"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
        >
          <div className="auth-form-panel-top">
            <Link to="/" className="auth-mobile-logo">
              {storeName}
            </Link>
            <div className="auth-form-switch">
              <span>{isLogin ? "New here?" : "Already a member?"}</span>
              <Link to={isLogin ? "/account/signup" : "/account/login"} state={location.state}>
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </div>
          </div>

          <div className="auth-form-content">
            <div className="auth-form-heading">
              <span className="auth-form-eyebrow">{isLogin ? "Welcome back" : "Join the community"}</span>
              <h2>{isLogin ? "Sign in to your account." : "Create your account."}</h2>
              <p>
                {isLogin
                  ? "Access your saved pieces, orders, and personal details."
                  : "Keep your favorite pieces close and make checkout effortless."}
              </p>
            </div>

            <form className="auth-modern-form" onSubmit={submit} noValidate>
              {!isLogin && (
                <InputField
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  onBlur={markTouched("name")}
                  placeholder="Your full name"
                  icon={UserRound}
                  autoComplete="name"
                  error={touched.name ? errors.name : ""}
                />
              )}

              <InputField
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                onBlur={markTouched("email")}
                placeholder="you@example.com"
                icon={Mail}
                autoComplete="email"
                error={touched.email ? errors.email : ""}
              />

              <InputField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={updateField}
                onBlur={markTouched("password")}
                placeholder="Enter your password"
                icon={LockKeyhole}
                autoComplete={isLogin ? "current-password" : "new-password"}
                error={touched.password ? errors.password : ""}
              >
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </InputField>

              {!isLogin && (
                <div className="auth-password-area">
                  <InputField
                    label="Confirm password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={updateField}
                    onBlur={markTouched("confirmPassword")}
                    placeholder="Repeat your password"
                    icon={LockKeyhole}
                    autoComplete="new-password"
                    error={touched.confirmPassword ? errors.confirmPassword : ""}
                  >
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </InputField>

                  {form.password && (
                    <div className={`password-strength ${strength.className}`}>
                      <div className="password-strength-bars">
                        {[1, 2, 3, 4].map((bar) => (
                          <span key={bar} className={bar <= strength.level ? "filled" : ""} />
                        ))}
                      </div>
                      <small>{strength.label}</small>
                    </div>
                  )}
                </div>
              )}

              {isLogin && (
                <div className="auth-options-row">
                  <span />
                  <Link to="/account/forgot-password">Forgot password?</Link>
                </div>
              )}

              {!isLogin && (
                <label className="auth-checkbox auth-terms-checkbox">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>
                    I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
                  </span>
                </label>
              )}

              {formError && (
                <p className="auth-form-error" role="alert">
                  {formError}
                </p>
              )}

              <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</span>
                {!isSubmitting && <ArrowRight size={17} />}
              </button>

              {googleEnabled && (
                <>
                  <div className="auth-divider">
                    <span>or continue with</span>
                  </div>

                  <button
                    type="button"
                    className="social-login-button"
                    onClick={() => {
                      window.location.href = `${API_BASE_URL}/auth/google`;
                    }}
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>
                </>
              )}
            </form>

            <p className="auth-bottom-note">
              {isLogin ? (
                <>
                  New to {storeName}?{" "}
                  <Link to="/account/signup" state={location.state}>
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link to="/account/login" state={location.state}>
                    Sign in here
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="auth-form-footer">
            <span>Secure account access</span>
            <span className="auth-footer-icons">
              <LockKeyhole size={13} />
              <Heart size={13} />
            </span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
