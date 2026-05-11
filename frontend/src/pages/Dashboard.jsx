import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Upload, BrainCircuit, BookOpenCheck, Presentation } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

const Stat = ({ label, value, testid }) => (
  <div className="border border-border bg-card p-6 rounded-xl" data-testid={testid}>
    <div className="text-xs uppercase tracking-wider text-foreground/60">{label}</div>
    <div className="font-display text-3xl mt-2 tabular-nums">{value ?? "—"}</div>
  </div>
);

export default function Dashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/overview").then((r) => setData(r.data)).catch(() => {});
  }, []);

  const totals = data?.totals || {};
  const quickActions = [
    { to: "/documents", icon: Upload, label: t("dashboard.qa_upload") },
    { to: "/question-bank", icon: BrainCircuit, label: t("dashboard.qa_quiz") },
    { to: "/lesson-plans", icon: BookOpenCheck, label: t("dashboard.qa_lesson") },
    { to: "/live", icon: Presentation, label: t("dashboard.qa_live") },
  ];

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="dashboard-title">
          {t("dashboard.title", { name: user?.name?.split(" ")[0] || "" })}
        </h1>
        <p className="mt-2 text-foreground/60">{t("dashboard.sub")}</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <Stat label={t("dashboard.stat_docs")} value={totals.documents} testid="stat-docs" />
        <Stat label={t("dashboard.stat_quizzes")} value={totals.quizzes} testid="stat-quizzes" />
        <Stat label={t("dashboard.stat_classes")} value={totals.classes} testid="stat-classes" />
        <Stat label={t("dashboard.stat_gens")} value={totals.generations} testid="stat-gens" />
        <Stat label={t("dashboard.stat_live")} value={totals.live_sessions} testid="stat-live" />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl mb-4">{t("dashboard.quick_actions")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              data-testid={`qa-${to.replace("/", "")}`}
              className="group border border-border bg-card p-6 rounded-xl hover:bg-secondary transition-all hover:-translate-y-1"
            >
              <div className="h-10 w-10 rounded-md bg-[#F5A623]/10 text-[#F5A623] flex items-center justify-center mb-4 group-hover:bg-[#F5A623] group-hover:text-[#0B132B] transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-medium">{label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-border bg-card p-6 rounded-xl">
          <h3 className="font-display text-lg mb-4">{t("dashboard.timeline")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline || []}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#F5A623" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#F5A623" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="border border-border bg-card p-6 rounded-xl">
          <h3 className="font-display text-lg mb-4">{t("dashboard.by_type")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.by_type || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#0B132B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
