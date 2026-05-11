import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#F5A623", "#0B132B", "#3B82F6", "#10B981", "#EF4444"];

export default function Reports() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/reports/overview").then((r) => setData(r.data)).catch(() => {}); }, []);
  const totals = data?.totals || {};

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="reports-title">{t("reports.title")}</h1>
        <p className="mt-2 text-foreground/60">{t("reports.sub")}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          ["dashboard.stat_docs", totals.documents],
          ["dashboard.stat_quizzes", totals.quizzes],
          ["dashboard.stat_classes", totals.classes],
          ["dashboard.stat_gens", totals.generations],
          ["dashboard.stat_live", totals.live_sessions],
        ].map(([k, v]) => (
          <div key={k} className="border border-border bg-card p-6 rounded-xl">
            <div className="text-xs uppercase tracking-wider text-foreground/60">{t(k)}</div>
            <div className="font-display text-3xl mt-2 tabular-nums">{v ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border bg-card p-6 rounded-xl">
          <h3 className="font-display text-lg mb-4">{t("dashboard.timeline")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline || []}>
                <defs>
                  <linearGradient id="rg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#F5A623" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#F5A623" fill="url(#rg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="border border-border bg-card p-6 rounded-xl">
          <h3 className="font-display text-lg mb-4">{t("dashboard.by_type")}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.by_type || []} dataKey="count" nameKey="type" innerRadius={60} outerRadius={95}>
                  {(data?.by_type || []).map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
