import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Sparkles } from "lucide-react";

const TYPES = ["mcq", "true_false", "fill_blank", "short_answer", "essay", "matching"];

export default function QuestionBank() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [req, setReq] = useState({
    document_id: "",
    question_types: ["mcq"],
    difficulty: "medium",
    count: 8,
    topic: "",
    language: lang,
    include_answer_key: true,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState([]);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    api.get("/documents").then((r) => setDocs(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setReq((r) => ({ ...r, language: lang })); }, [lang]);

  const toggleType = (t_) => {
    setReq((r) => {
      const has = r.question_types.includes(t_);
      const list = has ? r.question_types.filter((x) => x !== t_) : [...r.question_types, t_];
      return { ...r, question_types: list.length ? list : ["mcq"] };
    });
  };

  const generate = async () => {
    setBusy(true);
    try {
      const payload = { ...req };
      if (!payload.document_id) delete payload.document_id;
      const r = await api.post("/generate/questions", payload);
      setResult(r.data.questions || []);
      toast.success(`Generated ${r.data.questions?.length || 0} questions`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveAsQuiz = async () => {
    if (!result.length) return;
    setSavingQuiz(true);
    try {
      const payload = { ...req, title: title || `Quiz ${new Date().toLocaleString()}` };
      if (!payload.document_id) delete payload.document_id;
      const r = await api.post("/generate/quiz", payload);
      toast.success("Saved as quiz");
      setResult(r.data.questions || []);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSavingQuiz(false);
    }
  };

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="qb-title">{t("qb.title")}</h1>
        <p className="mt-2 text-foreground/60 max-w-2xl">{t("qb.sub")}</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left form */}
        <aside className="lg:col-span-1 border border-border bg-card rounded-xl p-6 space-y-5 h-fit lg:sticky lg:top-6">
          <div>
            <Label>{t("qb.source")}</Label>
            <Select value={req.document_id} onValueChange={(v) => setReq({ ...req, document_id: v === "_none" ? "" : v })}>
              <SelectTrigger data-testid="qb-source-select"><SelectValue placeholder={t("qb.no_source")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t("qb.no_source")}</SelectItem>
                {docs.map((d) => (<SelectItem key={d.id} value={d.id}>{d.title || d.filename}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("qb.types")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TYPES.map((tp) => (
                <label key={tp} className="flex items-center gap-2 text-sm" data-testid={`qb-type-${tp}`}>
                  <Checkbox checked={req.question_types.includes(tp)} onCheckedChange={() => toggleType(tp)} />
                  {t(`qb.${tp}`)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("qb.difficulty")}</Label>
            <Select value={req.difficulty} onValueChange={(v) => setReq({ ...req, difficulty: v })}>
              <SelectTrigger data-testid="qb-difficulty-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{t("qb.easy")}</SelectItem>
                <SelectItem value="medium">{t("qb.medium")}</SelectItem>
                <SelectItem value="hard">{t("qb.hard")}</SelectItem>
                <SelectItem value="mixed">{t("qb.mixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("qb.count")}</Label>
            <Input type="number" min={1} max={50} value={req.count} onChange={(e) => setReq({ ...req, count: parseInt(e.target.value) || 1 })} data-testid="qb-count-input" />
          </div>
          <div>
            <Label>{t("qb.topic")}</Label>
            <Input value={req.topic} onChange={(e) => setReq({ ...req, topic: e.target.value })} data-testid="qb-topic-input" />
          </div>
          <div>
            <Label>{t("qb.language")}</Label>
            <Select value={req.language} onValueChange={(v) => setReq({ ...req, language: v })}>
              <SelectTrigger data-testid="qb-lang-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("qb.include_key")}</Label>
            <Switch checked={req.include_answer_key} onCheckedChange={(v) => setReq({ ...req, include_answer_key: v })} />
          </div>
          <Button onClick={generate} disabled={busy} className="w-full gap-2" data-testid="qb-generate-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? t("qb.generating") : t("qb.generate")}
          </Button>
        </aside>

        {/* Result */}
        <section className="lg:col-span-2 space-y-4">
          {result.length > 0 && (
            <div className="border border-border bg-card rounded-xl p-5 flex flex-wrap gap-3 items-center" data-testid="qb-save-bar">
              <Input placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-[160px]" />
              <Button onClick={saveAsQuiz} variant="outline" disabled={savingQuiz} className="gap-2" data-testid="qb-save-quiz-btn">
                {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("qb.save_as_quiz")}
              </Button>
            </div>
          )}
          {result.map((q, i) => (
            <article key={q.id || i} className="border border-border bg-card rounded-xl p-6 qfade" data-testid={`qb-result-${i}`}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display text-2xl text-[#F5A623] tabular-nums">{(i + 1).toString().padStart(2, "0")}</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-foreground/70">{q.type}</span>
              </div>
              <p className="font-medium leading-relaxed">{q.text}</p>
              {Array.isArray(q.options) && (
                <ul className="mt-4 space-y-2">
                  {q.options.map((opt, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="text-foreground/40">{String.fromCharCode(65 + idx)}.</span>
                      <span>{typeof opt === "string" ? opt : JSON.stringify(opt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {req.include_answer_key && q.answer != null && (
                <div className="mt-4 pt-4 border-t border-border text-sm">
                  <div className="text-foreground/50 mb-1">Answer:</div>
                  <div className="text-foreground">{typeof q.answer === "string" ? q.answer : JSON.stringify(q.answer)}</div>
                  {q.explanation && <div className="text-foreground/60 mt-2">{q.explanation}</div>}
                </div>
              )}
            </article>
          ))}
          {!busy && result.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50">
              {t("qb.sub")}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
