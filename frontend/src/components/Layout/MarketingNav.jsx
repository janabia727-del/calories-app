import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { Logo } from "@/components/Layout/DashboardLayout";

export default function MarketingNav() {
  const { t, lang, toggleLang } = useLang();
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="marketing-logo">
          <Logo className="h-7 w-7" />
          <span className="font-display text-xl">{t("brand")}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">
            {t("nav.features")}
          </a>
          <a href="#how" className="text-foreground/70 hover:text-foreground transition-colors">
            {t("nav.how")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="marketing-lang-btn">
            <Languages className="h-4 w-4 me-1" />
            {lang === "ar" ? "EN" : "ع"}
          </Button>
          <Link to="/login">
            <Button variant="ghost" size="sm" data-testid="marketing-login-btn">{t("nav.login")}</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" data-testid="marketing-signup-btn">{t("nav.signup")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
