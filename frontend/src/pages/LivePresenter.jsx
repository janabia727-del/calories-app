import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Play, ChevronRight, Eye, X, Copy, Users, Languages } from "lucide-react";

const OPT_CLASS = ["qbtn-a", "qbtn-b", "qbtn-c", "qbtn-d"];

export default function LivePresenter() {
  const { code } = useParams();
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const [sess, setSess] = useState(null);
  const [timer, setTimer] = useState(0);
  const tRef = useRef(null);

  const fetchSess = async () => {
    try { const r = await api.get(`/live/sessions/${code}/teacher`); setSess(r.data); }
    catch { toast.error("Session not found"); navigate("/live"); }
  };

  useEffect(() => { fetchSess(); }, [code]);

  // Poll every 1.5s
  useEffect(() => {
    const id = setInterval(fetchSess, 1500);
    return () => clearInterval(id);
  }, [code]);

  // Timer
  useEffect(() => {
    if (!sess) return;
    if (sess.status === "running") {
      const start = Date.now();
      tRef.current && clearInterval(tRef.current);
      setTimer(sess.timer_seconds);
      tRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = Math.max(0, sess.timer_seconds - elapsed);
        setTimer(remaining);
        if (remaining === 0) { clearInterval(tRef.current); tRef.current = null; }
      }, 250);
    } else {
      tRef.current && clearInterval(tRef.current);
      tRef.current = null;
    }
    return () => { tRef.current && clearInterval(tRef.current); };
  }, [sess?.current_q_idx, sess?.status, sess?.timer_seconds]);

  const control = async (action) => {
    try { await api.post(`/live/sessions/${code}/control`, { action }); fetchSess(); }
    catch { toast.error("Failed"); }
  };

  if (!sess) return <div className="min-h-screen bg-[#0B132B] text-white flex items-center justify-center">Loading…</div>;

  const quiz = sess.quiz;
  const total = quiz?.questions?.length || 0;
  const idx = sess.current_q_idx ?? 0;
  const currentQ = quiz?.questions?.[idx];
  const joinUrl = `${window.location.origin}/join?code=${code}`;
  const isLobby = sess.status === "lobby";
  const isRunning = sess.status === "running";
  const isRevealed = sess.status === "revealed";
  const isEnded = sess.status === "ended";

  const breakdown = (() => {
    if (!currentQ || !Array.isArray(currentQ.options)) return null;
    const counts = {};
    sess.current_answers?.forEach((a) => { counts[a.answer] = (counts[a.answer] || 0) + 1; });
    const total_ = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return currentQ.options.map((opt) => ({ opt, n: counts[opt] || 0, pct: Math.round(100 * (counts[opt] || 0) / total_) }));
  })();

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex flex-col" dir={(quiz?.language || lang) === "ar" ? "rtl" : "ltr"} data-testid="live-presenter">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/60">{t("live.code")}</div>
            <div className="font-display text-3xl tracking-tighter tabular-nums">{sess.code}</div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success(t("common.copied")); }}
            className="text-white/70 hover:text-[#F5A623] transition-colors"
            data-testid="live-copy-url-btn"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white/80"><Users className="h-4 w-4" /> <span className="tabular-nums" data-testid="live-participants-count">{sess.participants?.length || 0}</span></div>
          <div className="text-white/70 text-sm tabular-nums">{Math.min(idx + 1, total)} / {total}</div>
          <button onClick={toggleLang} className="text-white/70 hover:text-white"><Languages className="h-4 w-4" /></button>
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate("/live")}><X className="h-4 w-4 me-1" /> Exit</Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col p-8 lg:p-16">
        {isLobby && (
          <div className="flex-1 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5A623] text-[#0B132B] text-xs font-bold uppercase tracking-wider mb-6">{t("live.lobby")}</div>
              <h1 className="font-display text-5xl lg:text-7xl leading-tight tracking-tight">{quiz?.title}</h1>
              <p className="mt-6 text-white/70 text-xl">{t("live.join_url")}: <code className="text-[#F5A623]">{joinUrl}</code></p>
              <div className="mt-12 flex gap-3">
                <Button size="lg" className="bg-[#F5A623] text-[#0B132B] hover:bg-[#F5A623]/90 gap-2" onClick={() => control("start")} data-testid="live-start-btn">
                  <Play className="h-4 w-4" /> {t("live.start")}
                </Button>
              </div>
              {(sess.participants || []).length > 0 && (
                <div className="mt-12">
                  <div className="text-white/50 text-sm uppercase tracking-wider mb-3">{t("live.participants")}</div>
                  <div className="flex flex-wrap gap-2">
                    {sess.participants.map((p) => (
                      <span key={p.id} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-6 inline-block">
                <QRCodeSVG value={joinUrl} size={280} bgColor="#FFFFFF" fgColor="#0B132B" />
              </div>
            </div>
          </div>
        )}

        {(isRunning || isRevealed) && currentQ && (
          <div className="flex-1 flex flex-col">
            {/* Timer ring */}
            {isRunning && (
              <div className="mb-6 self-start">
                <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center font-display text-2xl tabular-nums">
                  <span style={{ color: timer < 6 ? "#EF4444" : "#F5A623" }}>{timer}</span>
                </div>
              </div>
            )}
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-balance qfade" data-testid="live-question-text">
              {currentQ.text}
            </h2>
            {Array.isArray(currentQ.options) && (
              <div className="mt-12 grid sm:grid-cols-2 gap-4">
                {currentQ.options.slice(0, 4).map((opt, i) => {
                  const isCorrect = isRevealed && String(opt).trim().toLowerCase() === String(currentQ.answer || "").trim().toLowerCase();
                  const b = breakdown?.[i];
                  return (
                    <div
                      key={i}
                      className={`${OPT_CLASS[i]} rounded-xl p-6 lg:p-8 font-display text-2xl lg:text-3xl leading-tight relative overflow-hidden transition-all ${isRevealed && !isCorrect ? "opacity-40" : ""}`}
                      data-testid={`live-option-${i}`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-base opacity-80">{String.fromCharCode(65 + i)}.</span>
                        <span className="flex-1">{typeof opt === "string" ? opt : JSON.stringify(opt)}</span>
                        {isRevealed && isCorrect && <span className="text-base">✓</span>}
                      </div>
                      {b && (
                        <div className="mt-3 flex items-center gap-2 text-sm opacity-90">
                          <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white/80" style={{ width: `${b.pct}%` }} />
                          </div>
                          <span className="tabular-nums">{b.n}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {currentQ.type !== "mcq" && !Array.isArray(currentQ.options) && (
              <div className="mt-12 p-8 rounded-xl border border-white/10 bg-white/5 text-xl">
                Open answer — discuss with the class.
                {isRevealed && currentQ.answer && (<div className="mt-4 text-[#F5A623]">Suggested: {String(currentQ.answer)}</div>)}
              </div>
            )}

            {/* Controls */}
            <div className="mt-12 flex flex-wrap gap-3">
              {isRunning && (
                <Button size="lg" className="bg-[#F5A623] text-[#0B132B] hover:bg-[#F5A623]/90 gap-2" onClick={() => control("reveal")} data-testid="live-reveal-btn">
                  <Eye className="h-4 w-4" /> {t("live.reveal")}
                </Button>
              )}
              <Button size="lg" className="bg-white text-[#0B132B] hover:bg-white/90 gap-2" onClick={() => control("next")} data-testid="live-next-btn">
                <ChevronRight className="h-4 w-4" /> {t("live.next")}
              </Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 ms-auto" onClick={() => control("end")} data-testid="live-end-btn">
                {t("live.end")}
              </Button>
            </div>
          </div>
        )}

        {isEnded && (
          <div className="flex-1 flex flex-col">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5A623] text-[#0B132B] text-xs font-bold uppercase tracking-wider mb-6">{t("live.ended")}</div>
            <h2 className="font-display text-4xl lg:text-6xl tracking-tight">{t("live.leaderboard")}</h2>
            <ol className="mt-10 space-y-3 max-w-2xl">
              {(sess.leaderboard || []).map((p, i) => (
                <li key={p.participant_id} className="flex items-baseline gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                  <span className="font-display text-3xl text-[#F5A623] tabular-nums w-12">{(i + 1).toString().padStart(2, "0")}</span>
                  <span className="flex-1 text-xl">{p.name}</span>
                  <span className="font-display text-2xl tabular-nums">{p.score}</span>
                </li>
              ))}
            </ol>
            <div className="mt-12">
              <Button size="lg" onClick={() => navigate("/live")} className="bg-white text-[#0B132B] hover:bg-white/90">{t("common.back")}</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
