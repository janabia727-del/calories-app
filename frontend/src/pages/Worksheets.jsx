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

const WS_TYPES = ["practice", "homework", "group", "icebreaker", "critical_thinking"];

export default function Worksheets() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [req, setReq] = useState({ document_id: "", worksheet_type: "practice", count: 8, topic: "", language: lang });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get("/documents").then((r) => setDocs(r.data)).catch(() => {}); }, []);
  useEffect(() => { setReq((r) => ({ ...r, language: lang })); }, [lang]);

  const gen = async () => {
    setBusy(true);
    try {
      const payload = { ...req };
      if (!payload.document_id) delete payload.document_id;
      const r = await api.post("/generate/worksheet", payload);
      setResult(r.data.worksheet);
      toast.success("Generated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="ws-title">{t("ws.title")}</h1>
        <p className="mt-2 text-foreground/60 max-w-2xl">{t("ws.sub")}</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 border border-border bg-card rounded-xl p-6 space-y-4 h-fit">
          <div>
            <Label>{t("qb.source")}</Label>
            <Select value={req.document_id} onValueChange={(v) => setReq({ ...req, document_id: v === "_none" ? "" : v })}>
              <SelectTrigger data-testid="ws-source-select"><SelectValue placeholder={t("qb.no_source")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t("qb.no_source")}</SelectItem>
                {docs.map((d) => (<SelectItem key={d.id} value={d.id}>{d.title || d.filename}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("ws.type")}</Label>
            <Select value={req.worksheet_type} onValueChange={(v) => setReq({ ...req, worksheet_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WS_TYPES.map((tp) => (<SelectItem key={tp} value={tp}>{t(`ws.${tp}`)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("qb.count")}</Label>
            <Input type="number" min={1} max={30} value={req.count} onChange={(e) => setReq({ ...req, count: parseInt(e.target.value) || 1 })} />
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
          <Button onClick={gen} disabled={busy} className="w-full gap-2" data-testid="ws-generate-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("ws.generate")}
          </Button>
        </aside>
        <section className="lg:col-span-2">
          {!result ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50">{t("ws.sub")}</div>
          ) : (
            <article className="border border-border bg-card rounded-xl p-8 qfade" data-testid="ws-result">
              <h2 className="font-display text-2xl mb-3">{result.title}</h2>
              {result.instructions && <p className="text-foreground/70 mb-6">{result.instructions}</p>}
              <ol className="space-y-5 list-decimal ms-5">
                {(result.exercises || []).map((ex, i) => (
                  <li key={i} className="leading-relaxed">
                    <div className="font-medium">{ex.prompt}</div>
                    {ex.hint && <div className="text-xs text-foreground/60 mt-1">💡 {ex.hint}</div>}
                    {ex.answer && <div className="text-xs text-foreground/50 mt-1">Ans: {ex.answer}</div>}
                  </li>
                ))}
              </ol>
              {result.extension && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="text-xs uppercase tracking-wider text-foreground/50">Extension</div>
                  <p className="mt-2">{result.extension}</p>
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
