import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function LessonPlans() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [req, setReq] = useState({ document_id: "", duration: "daily", topic: "", language: lang });
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => { api.get("/documents").then((r) => setDocs(r.data)).catch(() => {}); }, []);
  useEffect(() => { setReq((r) => ({ ...r, language: lang })); }, [lang]);

  const gen = async () => {
    setBusy(true);
    try {
      const payload = { ...req };
      if (!payload.document_id) delete payload.document_id;
      const r = await api.post("/generate/lesson-plan", payload);
      setPlan(r.data.plan);
      toast.success("Lesson plan ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally { setBusy(false); }
  };

  const Section = ({ title, items }) => (
    Array.isArray(items) && items.length > 0 && (
      <div>
        <h3 className="text-xs uppercase tracking-wider text-foreground/50 mb-2">{title}</h3>
        <ul className="space-y-1.5 list-disc ms-5">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    )
  );

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="lp-title">{t("lp.title")}</h1>
        <p className="mt-2 text-foreground/60 max-w-2xl">{t("lp.sub")}</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 border border-border bg-card rounded-xl p-6 space-y-4 h-fit">
          <div>
            <Label>{t("qb.source")}</Label>
            <Select value={req.document_id} onValueChange={(v) => setReq({ ...req, document_id: v === "_none" ? "" : v })}>
              <SelectTrigger data-testid="lp-source-select"><SelectValue placeholder={t("qb.no_source")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t("qb.no_source")}</SelectItem>
                {docs.map((d) => (<SelectItem key={d.id} value={d.id}>{d.title || d.filename}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("lp.duration")}</Label>
            <Select value={req.duration} onValueChange={(v) => setReq({ ...req, duration: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("lp.daily")}</SelectItem>
                <SelectItem value="weekly">{t("lp.weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("qb.topic")}</Label>
            <Input value={req.topic} onChange={(e) => setReq({ ...req, topic: e.target.value })} />
          </div>
          <div>
            <Label>{t("qb.language")}</Label>
            <Select value={req.language} onValueChange={(v) => setReq({ ...req, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ar">العربية</SelectItem></SelectContent>
            </Select>
          </div>
          <Button onClick={gen} disabled={busy} className="w-full gap-2" data-testid="lp-generate-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("lp.generate")}
          </Button>
        </aside>
        <section className="lg:col-span-2">
          {!plan ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50">{t("lp.sub")}</div>
          ) : (
            <article className="border border-border bg-card rounded-xl p-8 qfade space-y-6" data-testid="lp-result">
              <header className="border-b border-border pb-4">
                <div className="text-xs uppercase tracking-wider text-[#F5A623]">{plan.duration} plan</div>
                <h2 className="font-display text-2xl mt-1">{plan.title}</h2>
              </header>
              <Section title={t("lp.objectives")} items={plan.objectives} />
              <Section title={t("lp.materials")} items={plan.materials} />
              {plan.warm_up && (<div><h3 className="text-xs uppercase tracking-wider text-foreground/50 mb-2">{t("lp.warm_up")}</h3><p>{plan.warm_up}</p></div>)}
              <Section title={t("lp.main")} items={plan.main_activities} />
              <Section title={t("lp.strategies")} items={plan.teaching_strategies} />
              <Section title={t("lp.ideas")} items={plan.interactive_ideas} />
              <Section title={t("lp.differentiation")} items={plan.differentiation} />
              <Section title={t("lp.homework_t")} items={plan.homework} />
              <Section title={t("lp.assessment")} items={plan.assessment} />
              {plan.closure && (<div><h3 className="text-xs uppercase tracking-wider text-foreground/50 mb-2">{t("lp.closure")}</h3><p>{plan.closure}</p></div>)}
            </article>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
