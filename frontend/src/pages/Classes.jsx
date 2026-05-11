import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { GRADES, SUBJECTS } from "@/i18n/translations";

export default function Classes() {
  const { t } = useLang();
  const [list, setList] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openStudent, setOpenStudent] = useState(null); // class object
  const [newCls, setNewCls] = useState({ name: "", grade: "", subject: "" });
  const [newStu, setNewStu] = useState({ name: "", email: "" });

  const load = async () => {
    try { const r = await api.get("/classes"); setList(r.data); }
    catch (err) { console.error("Failed to load classes", err); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newCls.name) return;
    try { await api.post("/classes", newCls); setOpenCreate(false); setNewCls({ name: "", grade: "", subject: "" }); toast.success("Created"); load(); }
    catch { toast.error("Failed"); }
  };
  const addStudent = async () => {
    if (!openStudent || !newStu.name) return;
    try { await api.post(`/classes/${openStudent.id}/students`, newStu); setNewStu({ name: "", email: "" }); toast.success("Added"); load(); }
    catch { toast.error("Failed"); }
  };
  const removeStudent = async (cid, sid) => {
    if (!window.confirm(t("common.confirm"))) return;
    await api.delete(`/classes/${cid}/students/${sid}`); load();
  };
  const removeClass = async (id) => {
    if (!window.confirm(t("common.confirm"))) return;
    await api.delete(`/classes/${id}`); load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight" data-testid="classes-title">{t("classes.title")}</h1>
          <p className="mt-2 text-foreground/60">{t("classes.sub")}</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="gap-2" data-testid="classes-new-btn">
          <Plus className="h-4 w-4" /> {t("classes.new_class")}
        </Button>
      </div>

      {list.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-16 text-center text-foreground/50">{t("classes.no_classes")}</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <article key={c.id} className="border border-border bg-card rounded-xl p-5" data-testid={`class-card-${c.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg">{c.name}</h3>
                <div className="text-xs text-foreground/60 mt-1">{c.grade} • {c.subject}</div>
              </div>
              <button onClick={() => removeClass(c.id)} className="text-destructive" data-testid={`class-del-${c.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground/60">{c.students?.length || 0} {t("classes.students")}</span>
                <button onClick={() => setOpenStudent(c)} className="text-xs underline" data-testid={`class-add-${c.id}`}>+ {t("classes.add_student")}</button>
              </div>
              <ul className="space-y-1">
                {(c.students || []).map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                    <button onClick={() => removeStudent(c.id, s.id)} className="text-xs text-destructive">×</button>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {/* New class dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("classes.new_class")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{t("classes.class_name")}</Label><Input value={newCls.name} onChange={(e) => setNewCls({ ...newCls, name: e.target.value })} data-testid="class-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("docs.grade")}</Label>
                <Select value={newCls.grade} onValueChange={(v) => setNewCls({ ...newCls, grade: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className="max-h-60">{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("docs.subject")}</Label>
                <Select value={newCls.subject} onValueChange={(v) => setNewCls({ ...newCls, subject: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className="max-h-60">{SUBJECTS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={create} data-testid="class-create-btn">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add student dialog */}
      <Dialog open={!!openStudent} onOpenChange={(o) => !o && setOpenStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("classes.add_student")} — {openStudent?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{t("classes.student_name")}</Label><Input value={newStu.name} onChange={(e) => setNewStu({ ...newStu, name: e.target.value })} data-testid="student-name-input" /></div>
            <div><Label>Email</Label><Input value={newStu.email} onChange={(e) => setNewStu({ ...newStu, email: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStudent(null)}>{t("common.cancel")}</Button>
            <Button onClick={addStudent} className="gap-2" data-testid="student-add-btn"><UserPlus className="h-4 w-4" />{t("classes.add_student")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
