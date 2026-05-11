import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Layout/DashboardLayout";
import { toast } from "sonner";
import { Languages } from "lucide-react";

export default function StudentJoin() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") || "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async (e) => {
    e?.preventDefault();
    if (!code || !name) return;
    setBusy(true);
    try {
      const r = await api.post("/live/join", { code: code.trim(), student_name: name.trim() });
      sessionStorage.setItem(`qalam:p:${r.data.code}`, JSON.stringify({ id: r.data.participant_id, name: r.data.name }));
      navigate(`/play/${r.data.code}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not join");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2"><Logo className="h-6 w-6" /><span className="font-display">{t("brand")}</span></a>
        <Button variant="ghost" size="sm" onClick={toggleLang}><Languages className="h-4 w-4 me-1" />{lang === "ar" ? "EN" : "ع"}</Button>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <form onSubmit={join} className="w-full max-w-md text-center">
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight" data-testid="join-title">{t("join.title")}</h1>
          <p className="text-foreground/60 mt-3">{t("join.enter_code")}</p>
          <div className="mt-10 space-y-4 text-start">
            <div>
              <Label>{t("join.enter_code")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" className="text-3xl text-center font-display tabular-nums tracking-widest h-16" inputMode="numeric" data-testid="join-code-input" />
            </div>
            <div>
              <Label>{t("join.your_name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" data-testid="join-name-input" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12" data-testid="join-submit-btn">{t("join.join")}</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
