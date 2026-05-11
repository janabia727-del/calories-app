import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import MarketingNav from "@/components/Layout/MarketingNav";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, ShieldCheck, ScanLine, Globe2, Languages, Lock } from "lucide-react";

export default function Landing() {
  const { t, lang } = useLang();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Sparkles, k: "f1" },
    { icon: ScanLine, k: "f2" },
    { icon: ShieldCheck, k: "f3" },
    { icon: Globe2, k: "f4" },
    { icon: Languages, k: "f5" },
    { icon: Lock, k: "f6" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* HERO */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-foreground/70" data-testid="hero-kicker">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
              {t("landing.hero_kicker")}
            </div>
            <h1 className="font-display mt-6 text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-balance" data-testid="hero-title">
              {t("landing.hero_title")}
            </h1>
            <p className="mt-6 text-lg text-foreground/70 max-w-2xl text-balance" data-testid="hero-sub">
              {t("landing.hero_sub")}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="gap-2" data-testid="hero-cta-primary">
                  {t("landing.cta_primary")} <Arrow className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/join">
                <Button size="lg" variant="outline" data-testid="hero-cta-secondary">
                  {t("landing.cta_secondary")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
              <img
                src="https://images.pexels.com/photos/5212321/pexels-photo-5212321.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Classroom"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-[#0B132B]/40 to-transparent" />
              <div className="absolute bottom-6 inset-x-6 text-white">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F5A623] text-[#0B132B] text-xs font-semibold">
                  LIVE • 24 students
                </div>
                <div className="mt-3 font-display text-2xl leading-tight">
                  "Photosynthesis converts ____ into glucose."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight max-w-3xl text-balance">
            {t("landing.who_title")}
          </h2>
          <p className="mt-4 text-foreground/70 max-w-2xl">{t("landing.who_desc")}</p>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-border rounded-xl overflow-hidden">
            {features.map(({ icon: Icon, k }, idx) => (
              <div key={k} className="p-8 border-border border-b lg:border-b-0 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:nth-child(2n):border-e-0 lg:nth-child(3n):border-e-0 border-e bg-background hover:bg-secondary/40 transition-colors group">
                <div className="h-10 w-10 rounded-md bg-[#F5A623]/10 text-[#F5A623] flex items-center justify-center mb-5 group-hover:bg-[#F5A623] group-hover:text-[#0B132B] transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl">{t(`landing.${k}_title`)}</h3>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{t(`landing.${k}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-sm text-foreground/60 uppercase tracking-wider mb-3">01 → 04</div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-balance">
              {lang === "ar"
                ? "أربع خطوات بسيطة من المنهج إلى الفصل."
                : "Four simple steps from curriculum to classroom."}
            </h2>
            <ol className="mt-10 space-y-6">
              {[
                lang === "ar" ? "اختر دولتك ومنهجك وصفك ومادتك." : "Pick country, curriculum, grade, subject.",
                lang === "ar" ? "ارفع PDF الدرس." : "Upload your lesson PDF.",
                lang === "ar" ? "أنشئ أسئلة وخطط دروس وأوراق عمل." : "Generate questions, lesson plans, worksheets.",
                lang === "ar" ? "ابدأ اختباراً مباشراً برمز QR في الصف." : "Run a live quiz with a QR code in class.",
              ].map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-display text-2xl text-[#F5A623] w-8 shrink-0 tabular-nums">{(i + 1).toString().padStart(2, "0")}</span>
                  <span className="text-foreground/80 pt-1">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://images.pexels.com/photos/8423416/pexels-photo-8423416.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" className="rounded-xl aspect-[3/4] object-cover col-span-1" alt="" />
            <img src="https://images.pexels.com/photos/8423012/pexels-photo-8423012.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" className="rounded-xl aspect-[3/4] object-cover col-span-1 mt-12" alt="" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border bg-[#0B132B] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-balance">{t("landing.cta_title")}</h2>
          <p className="mt-4 text-white/70 text-balance">{t("landing.cta_desc")}</p>
          <div className="mt-10">
            <Link to="/signup">
              <Button size="lg" className="bg-[#F5A623] text-[#0B132B] hover:bg-[#F5A623]/90 gap-2" data-testid="footer-cta-btn">
                {t("nav.signup")} <Arrow className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-foreground/60">
          <div className="flex items-center gap-2">
            <span className="font-display">{t("brand")}</span>
            <span>•</span>
            <span>{t("tagline")}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/join" className="hover:text-foreground">Join classroom</Link>
            <Link to="/login" className="hover:text-foreground">{t("nav.login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
