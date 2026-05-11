import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Layout/DashboardLayout";
import { toast } from "sonner";
import { Languages } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Login() {
  const { t, lang, toggleLang } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("auth.err_invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B132B] text-white relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 relative z-10" data-testid="login-logo">
          <Logo className="h-7 w-7 text-white" />
          <span className="font-display text-xl">{t("brand")}</span>
        </Link>
        <div className="relative z-10">
          <p className="font-display text-3xl leading-tight text-balance">
            {lang === "ar"
              ? "أدوات تعليمية ذكية، تحت سيطرتك تماماً."
              : "Intelligent teaching tools. Fully under your control."}
          </p>
          <p className="mt-4 text-white/60">{t("tagline")}</p>
        </div>
        <div className="absolute -bottom-32 -end-32 w-96 h-96 rounded-full bg-[#F5A623]/20 blur-3xl pointer-events-none" />
      </div>

      {/* Right side */}
      <div className="flex flex-col p-6 sm:p-12">
        <div className="flex justify-between items-center">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <Logo className="h-6 w-6" /><span className="font-display">{t("brand")}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={toggleLang} className="ms-auto" data-testid="login-lang-btn">
            <Languages className="h-4 w-4 me-1" /> {lang === "ar" ? "EN" : "ع"}
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl tracking-tight" data-testid="login-title">{t("auth.welcome_back")}</h1>
            <p className="text-foreground/60 mt-2">{t("auth.signin_sub")}</p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" data-testid="login-email-input" />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" data-testid="login-password-input" />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
                {loading ? t("common.loading") : t("auth.signin")}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-foreground/60 uppercase tracking-wider">{t("auth.or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={googleLogin} data-testid="login-google-btn">
              <GoogleIcon /> {t("auth.continue_google")}
            </Button>

            <p className="mt-8 text-sm text-foreground/60">
              {t("auth.no_account")}{" "}
              <Link to="/signup" className="text-foreground font-medium underline-offset-4 hover:underline" data-testid="login-to-signup-link">
                {t("nav.signup")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
