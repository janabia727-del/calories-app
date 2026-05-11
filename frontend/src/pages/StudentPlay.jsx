import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Logo } from "@/components/Layout/DashboardLayout";

const OPT_CLASS = ["qbtn-a", "qbtn-b", "qbtn-c", "qbtn-d"];

export default function StudentPlay() {
  const { code } = useParams();
  const { t, lang } = useLang();
  const [sess, setSess] = useState(null);
  const [submitted, setSubmitted] = useState({}); // q_idx -> answer
  const [lastResult, setLastResult] = useState(null); // {correct: bool, q_idx}
  const meRef = useRef(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`qalam:p:${code}`);
    meRef.current = raw ? JSON.parse(raw) : null;
  }, [code]);

  const fetchSess = async () => {
    try { const r = await api.get(`/live/sessions/${code}`); setSess(r.data); }
    catch (err) { console.error("Failed to fetch live session", err); }
  };
  useEffect(() => { fetchSess(); const id = setInterval(fetchSess, 1500); return () => clearInterval(id); }, [code]);

  // Reset lastResult when question changes
  useEffect(() => { setLastResult(null); }, [sess?.current_q_idx]);

  const answer = async (val) => {
    if (!sess || !meRef.current) return;
    const q_idx = sess.current_q_idx;
    if (submitted[q_idx]) return;
    setSubmitted((s) => ({ ...s, [q_idx]: val }));
    try {
      const r = await api.post("/live/answer", { code, participant_id: meRef.current.id, question_id: sess.current_question?.id, answer: val });
      setLastResult({ correct: r.data.correct, q_idx });
    } catch (err) {
      console.error("Failed to submit answer", err);
    }
  };

  const status = sess?.status;
  const cq = sess?.current_question;
  const q_idx = sess?.current_q_idx;
  const answered = q_idx != null && submitted[q_idx];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={(sess?.language || lang) === "ar" ? "rtl" : "ltr"} data-testid="student-play">
      <header className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2"><Logo className="h-5 w-5" /><span className="font-display text-sm">{sess?.quiz_title || t("brand")}</span></div>
        <div className="text-xs text-foreground/60">
          {meRef.current?.name} · {sess?.code}
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!sess && <div className="text-foreground/60">{t("common.loading")}</div>}
        {status === "lobby" && (
          <div className="text-center">
            <div className="text-foreground/50 uppercase tracking-wider text-xs mb-3">{t("live.lobby")}</div>
            <div className="font-display text-3xl">{t("join.waiting")}</div>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <span className="h-2 w-2 rounded-full bg-[#F5A623] animate-pulse" /> <span className="text-sm">Connected</span>
            </div>
          </div>
        )}
        {(status === "running" || status === "revealed") && cq && (
          <div className="w-full max-w-2xl">
            <div className="text-xs text-foreground/50 uppercase tracking-wider mb-3">Question {q_idx + 1} / {sess.total_questions}</div>
            <h2 className="font-display text-2xl sm:text-3xl leading-tight mb-8" data-testid="play-question-text">{cq.text}</h2>
            {Array.isArray(cq.options) ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {cq.options.slice(0, 4).map((opt, i) => {
                  const isMine = submitted[q_idx] === opt;
                  return (
                    <button
                      key={i}
                      disabled={!!answered || status === "revealed"}
                      onClick={() => answer(opt)}
                      className={`${OPT_CLASS[i]} rounded-xl p-5 text-start font-medium text-lg transition-all ${isMine ? "ring-4 ring-[#0B132B]" : ""} ${answered && !isMine ? "opacity-50" : ""}`}
                      data-testid={`play-option-${i}`}
                    >
                      <span className="font-mono text-sm opacity-80 me-2">{String.fromCharCode(65 + i)}.</span>
                      {typeof opt === "string" ? opt : JSON.stringify(opt)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-border bg-card text-foreground/70 text-center">
                Discuss with the class.
              </div>
            )}
            {answered && (
              <div className="mt-8 text-center qfade">
                <div className="text-foreground/60 text-sm">{t("join.answered")}</div>
                {status === "revealed" && lastResult && (
                  <div className={`mt-2 font-display text-2xl ${lastResult.correct ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {lastResult.correct ? t("join.correct") : t("join.incorrect")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {status === "ended" && (
          <div className="text-center">
            <div className="font-display text-4xl">{t("join.end")}</div>
          </div>
        )}
      </main>
    </div>
  );
}
