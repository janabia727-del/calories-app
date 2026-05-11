import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";

export default function Grading() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ document_id: "", question: "", student_answer: "", rubric: "", language: lang });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [teacherScore, setTeacherScore] = useState("");

  useEffect(() => { api.get("/documents").then((r) => setDocs(r.data)).catch(() => {}); }, []);
  useEffect(() => { setForm((f) => ({ ...f, language: lang })); }, [lang]);

  const grade = async () => {
    if (!form.question || !form.student_answer) { toast.error(t("common.required")); return; }
    setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.document_id) delete payload.document_id;
      const r = await api.post("/grade/essay", payload);
      setResult(r.data.result);
      setTeacherScore(String(r.data.result?.score ?? ""));
    } catch (e) {
      toast.error("Grading failed");
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="grade-title">{t("grade.title")}</h1>
        <p className="mt-2 text-foreground/60 max-w-2xl">{t("grade.sub")}</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="border border-border bg-card rounded-xl p-6 space-y-4">
          <div>
            <Label>{t("qb.source")}</Label>
            <Select value={form.document_id} onValueChange={(v) => setForm({ ...form, document_id: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder={t("qb.no_source")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t("qb.no_source")}</SelectItem>
                {docs.map((d) => (<SelectItem key={d.id} value={d.id}>{d.title || d.filename}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("grade.question")}</Label>
            <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={3} data-testid="grade-question-input" />
          </div>
          <div>
            <Label>{t("grade.student_answer")}</Label>
            <Textarea value={form.student_answer} onChange={(e) => setForm({ ...form, student_answer: e.target.value })} rows={6} data-testid="grade-answer-input" />
          </div>
          <div>
            <Label>{t("grade.rubric")}</Label>
            <Textarea value={form.rubric} onChange={(e) => setForm({ ...form, rubric: e.target.value })} rows={2} data-testid="grade-rubric-input" />
          </div>
          <Button onClick={grade} disabled={busy} className="w-full gap-2" data-testid="grade-submit-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {t("grade.grade_btn")}
          </Button>
        </section>

        <section>
          {!result ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50 h-full flex items-center justify-center">{t("grade.sub")}</div>
          ) : (
            <article className="border border-border bg-card rounded-xl p-8 qfade space-y-5" data-testid="grade-result">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl text-[#F5A623] tabular-nums">{result.score ?? "—"}</span>
                <span className="text-foreground/50">/ 100 · {t("grade.score")}</span>
              </div>
              <Block title={t("grade.strengths")} items={result.strengths} positive />
              <Block title={t("grade.mistakes")} items={result.mistakes} />
              <Block title={t("grade.corrections")} items={result.corrections} />
              {result.feedback && <div><div className="text-xs uppercase tracking-wider text-foreground/50 mb-1">{t("grade.feedback")}</div><p>{result.feedback}</p></div>}
              <div className="pt-4 border-t border-border">
                <Label>{t("grade.teacher_review")}</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input type="number" min={0} max={100} value={teacherScore} onChange={(e) => setTeacherScore(e.target.value)} className="w-24" data-testid="grade-teacher-score" />
                  <Button onClick={() => toast.success(t("grade.saved"))} data-testid="grade-save-btn">{t("grade.save")}</Button>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Block({ title, items, positive }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-foreground/50 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={positive ? "text-[#10B981]" : "text-[#EF4444]"}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
