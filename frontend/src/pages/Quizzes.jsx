import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash2, Presentation, FileDown } from "lucide-react";
import { toast } from "sonner";

export default function Quizzes() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  const load = async () => {
    try { const r = await api.get("/quizzes"); setList(r.data); }
    catch (err) { console.error("Failed to load quizzes", err); }
  };
  useEffect(() => { load(); }, []);

  const startLive = async (q) => {
    try {
      const r = await api.post("/live/sessions", { quiz_id: q.id, timer_seconds: 25 });
      navigate(`/live/${r.data.code}`);
    } catch (e) {
      toast.error("Could not start live session");
    }
  };

  const exportPdf = (quiz) => {
    const body = quiz.questions.map((q, i) => {
      const opts = Array.isArray(q.options)
        ? q.options.map((o, idx) => `<li>${String.fromCharCode(65 + idx)}. ${escapeHtml(typeof o === "string" ? o : JSON.stringify(o))}</li>`).join("")
        : "";
      return `<article style="page-break-inside:avoid;margin-bottom:24px;">
          <h3>${i + 1}. ${escapeHtml(q.text || "")}</h3>
          ${opts ? `<ul>${opts}</ul>` : ""}
          ${q.answer != null ? `<p><b>Answer:</b> ${escapeHtml(String(q.answer))}</p>` : ""}
        </article>`;
    }).join("");
    const html = `<!doctype html><html lang="${quiz.language || 'en'}" dir="${quiz.language === 'ar' ? 'rtl' : 'ltr'}">
      <head><meta charset="utf-8"/><title>${escapeHtml(quiz.title)}</title>
      <style>body{font-family:system-ui;padding:32px;max-width:780px;margin:auto;color:#0B132B}h1{border-bottom:2px solid #F5A623;padding-bottom:8px}ul{list-style:none;padding:0}</style>
      </head><body><h1>${escapeHtml(quiz.title)}</h1>${body}</body></html>`;
    // Use a Blob URL instead of document.write to avoid the XSS-prone pattern.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) { URL.revokeObjectURL(url); return; }
    // Trigger print after the new window finishes loading the blob.
    w.addEventListener("load", () => {
      try { w.print(); } catch (err) { console.error("print failed", err); }
      // Revoke later so the printed window can keep the resource until it's done.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  };

  const del = async (id) => {
    if (!window.confirm(t("common.confirm"))) return;
    await api.delete(`/quizzes/${id}`); load();
  };

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="quizzes-title">{t("quiz.title")}</h1>
        <p className="mt-2 text-foreground/60">{t("quiz.sub")}</p>
      </header>
      {list.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50">
          {t("quiz.empty")} <Link to="/question-bank" className="text-foreground underline ms-1">{t("qb.title")}</Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((q) => (
          <article key={q.id} className="border border-border bg-card p-5 rounded-xl" data-testid={`quiz-card-${q.id}`}>
            <div className="text-[10px] uppercase tracking-wider text-foreground/50">{q.metadata?.difficulty || "—"} • {q.language?.toUpperCase()}</div>
            <h3 className="font-display text-lg mt-2 leading-tight">{q.title}</h3>
            <p className="text-xs text-foreground/60 mt-1">{q.questions?.length || 0} {t("quiz.questions")}</p>
            <div className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => startLive(q)} className="gap-1" data-testid={`quiz-live-${q.id}`}>
                <Presentation className="h-3.5 w-3.5" />{t("quiz.go_live")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportPdf(q)} className="gap-1" data-testid={`quiz-pdf-${q.id}`}>
                <FileDown className="h-3.5 w-3.5" />{t("quiz.export_pdf")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(q.id)} className="ms-auto text-destructive" data-testid={`quiz-del-${q.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </DashboardLayout>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
