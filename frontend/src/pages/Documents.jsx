import React, { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { COUNTRIES, CURRICULA, GRADES, SUBJECTS } from "@/i18n/translations";

export default function Documents() {
  const { t, lang } = useLang();
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ country: "", curriculum: "", grade: "", subject: "", title: "", language: lang });
  const [uploading, setUploading] = useState(false);
  const dropRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get("/documents");
      setDocs(r.data);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };
  useEffect(() => { load(); }, []);

  const onFile = (f) => {
    if (!f) return;
    setFile(f);
    setMeta((m) => ({ ...m, title: m.title || f.name.replace(/\.[^.]+$/, "") }));
    setOpen(true);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(meta).forEach(([k, v]) => v && fd.append(k, v));
      await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Uploaded");
      setOpen(false); setFile(null);
      setMeta({ country: "", curriculum: "", grade: "", subject: "", title: "", language: lang });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("common.confirm"))) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="docs-title">{t("docs.title")}</h1>
          <p className="mt-2 text-foreground/60 max-w-2xl">{t("docs.sub")}</p>
        </div>
        <Button onClick={() => document.getElementById("doc-file-input").click()} data-testid="docs-upload-btn" className="gap-2">
          <Upload className="h-4 w-4" /> {t("docs.upload")}
        </Button>
        <input id="doc-file-input" type="file" accept=".pdf,application/pdf,text/plain"
               className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
        onClick={() => document.getElementById("doc-file-input").click()}
        className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-[#F5A623] transition-colors bg-card"
        data-testid="docs-dropzone"
      >
        <Upload className="h-8 w-8 mx-auto text-foreground/40" />
        <p className="mt-3 text-foreground/60">{t("docs.drag")}</p>
      </div>

      {/* List */}
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.length === 0 && (
          <div className="col-span-full text-foreground/50 text-center py-12">{t("docs.empty")}</div>
        )}
        {docs.map((d) => (
          <div key={d.id} className="border border-border bg-card p-5 rounded-xl flex flex-col group hover:-translate-y-1 transition-transform" data-testid={`doc-card-${d.id}`}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-[#F5A623]/10 text-[#F5A623] flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{d.title || d.filename}</div>
                <div className="text-xs text-foreground/60 truncate">{d.filename}</div>
              </div>
            </div>
            <dl className="mt-4 text-xs text-foreground/70 space-y-1">
              {d.subject && <div><span className="text-foreground/50">{t("docs.subject")}: </span>{d.subject}</div>}
              {d.grade && <div><span className="text-foreground/50">{t("docs.grade")}: </span>{d.grade}</div>}
              {d.curriculum && <div><span className="text-foreground/50">{t("docs.curriculum")}: </span>{d.curriculum}</div>}
              {d.pages != null && <div><span className="text-foreground/50">{t("docs.pages")}: </span>{d.pages}</div>}
            </dl>
            <p className="mt-3 text-xs text-foreground/60 line-clamp-3 min-h-[3rem]">{d.excerpt}</p>
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <a
                href={`${api.defaults.baseURL}/documents/${d.id}/download`}
                target="_blank" rel="noreferrer"
                className="text-xs text-foreground/70 hover:text-foreground underline-offset-4 hover:underline"
              >
                {t("docs.open")}
              </a>
              <button onClick={() => handleDelete(d.id)} className="text-xs text-destructive hover:underline" data-testid={`doc-delete-${d.id}`}>
                <Trash2 className="h-3.5 w-3.5 inline me-1" />{t("docs.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("docs.upload")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title</Label>
              <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} data-testid="upload-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetaSelect label={t("docs.country")} value={meta.country} onChange={(v) => setMeta({ ...meta, country: v })} options={COUNTRIES} testid="country" />
              <MetaSelect label={t("docs.curriculum")} value={meta.curriculum} onChange={(v) => setMeta({ ...meta, curriculum: v })} options={CURRICULA} testid="curriculum" />
              <MetaSelect label={t("docs.grade")} value={meta.grade} onChange={(v) => setMeta({ ...meta, grade: v })} options={GRADES} testid="grade" />
              <MetaSelect label={t("docs.subject")} value={meta.subject} onChange={(v) => setMeta({ ...meta, subject: v })} options={SUBJECTS} testid="subject" />
            </div>
            <div>
              <Label>{t("docs.lang")}</Label>
              <Select value={meta.language} onValueChange={(v) => setMeta({ ...meta, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleUpload} disabled={uploading} data-testid="confirm-upload-btn">
              {uploading && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
              {uploading ? t("docs.processing") : t("docs.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function MetaSelect({ label, value, onChange, options, testid }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={`select-${testid}`}><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
