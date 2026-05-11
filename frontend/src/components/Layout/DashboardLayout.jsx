import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, BrainCircuit, ListChecks, FileSpreadsheet,
  BookOpenCheck, PenLine, Users, BarChart3, Bot, Presentation, Settings,
  LogOut, Languages,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/documents", icon: FileText, key: "documents" },
  { to: "/question-bank", icon: BrainCircuit, key: "question_bank" },
  { to: "/quizzes", icon: ListChecks, key: "quizzes" },
  { to: "/worksheets", icon: FileSpreadsheet, key: "worksheets" },
  { to: "/lesson-plans", icon: BookOpenCheck, key: "lessons" },
  { to: "/grading", icon: PenLine, key: "grading" },
  { to: "/classes", icon: Users, key: "classes" },
  { to: "/live", icon: Presentation, key: "live" },
  { to: "/reports", icon: BarChart3, key: "reports" },
  { to: "/assistant", icon: Bot, key: "assistant" },
];

export default function DashboardLayout({ children }) {
  const { t, lang, toggleLang } = useLang();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-e border-border bg-card sticky top-0 h-screen">
        <Link to="/dashboard" className="px-6 py-6 flex items-center gap-2" data-testid="sidebar-logo">
          <Logo className="h-7 w-7 text-foreground" />
          <span className="font-display text-xl">{t("brand")}</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin">
          {navItems.map(({ to, icon: Icon, key }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                data-testid={`nav-${key}`}
                className={`flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(`nav_d.${key}`)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display text-sm">
              {(user?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              className="flex-1"
              data-testid="lang-toggle-btn"
            >
              <Languages className="h-3.5 w-3.5 me-1" />
              {lang === "ar" ? "EN" : "العربية"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="flex items-center justify-between p-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-display">{t("brand")}</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleLang}>
              <Languages className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {/* Mobile horizontal nav */}
        <div className="overflow-x-auto scrollbar-thin border-t border-border bg-card">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {navItems.map(({ to, icon: Icon, key }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                    active ? "bg-primary text-primary-foreground" : "text-foreground/70 bg-secondary"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t(`nav_d.${key}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 md:pt-0 pt-28 px-4 md:px-10 py-8 max-w-[1500px]">
        {children}
      </main>
    </div>
  );
}

export function Logo({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <path d="M6 26 L20 6 L26 12 L12 26 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M20 6 L24 2 L30 8 L26 12" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="9" cy="23" r="1.5" fill="hsl(var(--accent))"/>
    </svg>
  );
}
