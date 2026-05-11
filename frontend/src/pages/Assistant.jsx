import React, { useRef, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Bot } from "lucide-react";

export default function Assistant() {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef(`asst-${Date.now()}`);

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    const userMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const r = await api.post("/assistant/chat", {
        session_id: sessionId.current,
        message: userMsg.text,
        language: lang,
      });
      setMessages((m) => [...m, { role: "assistant", text: r.data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, something went wrong." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="asst-title">{t("asst.title")}</h1>
        <p className="mt-2 text-foreground/60">{t("asst.sub")}</p>
      </header>
      <div className="border border-border bg-card rounded-xl flex flex-col" style={{ height: "min(70vh, 720px)" }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin" data-testid="asst-thread">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-foreground/50 text-center">
              <Bot className="h-10 w-10 mb-3" />
              <p className="max-w-md">{t("asst.empty")}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div className="text-foreground/50 text-sm">…</div>}
        </div>
        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("asst.placeholder")} className="flex-1" data-testid="asst-input" />
          <Button type="submit" disabled={busy} className="gap-2" data-testid="asst-send-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("asst.send")}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
