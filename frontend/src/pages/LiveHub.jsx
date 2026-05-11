import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Presentation } from "lucide-react";

export default function LiveHub() {
  const { t } = useLang();
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState("");
  const [timer, setTimer] = useState(25);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.get("/quizzes").then((r) => setQuizzes(r.data)).catch(() => {}); }, []);

  const create = async () => {
    if (!quizId) return;
    setBusy(true);
    try {
      const r = await api.post("/live/sessions", { quiz_id: quizId, timer_seconds: parseInt(timer) || 25 });
      navigate(`/live/${r.data.code}`);
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="live-title">{t("live.title")}</h1>
        <p className="mt-2 text-foreground/60">{t("live.sub")}</p>
      </header>
      <div className="max-w-xl border border-border bg-card rounded-xl p-8 space-y-4">
        <div>
          <Label>{t("live.pick_quiz")}</Label>
          <Select value={quizId} onValueChange={setQuizId}>
            <SelectTrigger data-testid="live-quiz-select"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {quizzes.length === 0 && <div className="p-3 text-sm text-foreground/60">No quizzes. <Link to="/question-bank" className="underline">Create one</Link>.</div>}
              {quizzes.map((q) => (<SelectItem key={q.id} value={q.id}>{q.title} ({q.questions?.length || 0})</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("live.timer")}</Label>
          <Input type="number" min={5} max={180} value={timer} onChange={(e) => setTimer(e.target.value)} data-testid="live-timer-input" />
        </div>
        <Button onClick={create} disabled={!quizId || busy} className="w-full gap-2" data-testid="live-create-btn">
          <Presentation className="h-4 w-4" /> {t("live.create_session")}
        </Button>
      </div>
    </DashboardLayout>
  );
}
