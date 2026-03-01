import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

const empty = { title: "", description: "", icon: "plane", is_active: true, sort_order: 0 };

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description, icon: s.icon, is_active: s.is_active, sort_order: s.sort_order });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    if (editing) {
      await supabase.from("services").update(form).eq("id", editing.id);
    } else {
      await supabase.from("services").insert(form);
    }
    setSaving(false);
    setModal(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    fetchServices();
  };

  const toggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchServices();
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{services.length} services</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Icon</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-card-foreground">{s.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.icon}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(s)} className={`w-10 h-5 rounded-full transition-colors ${s.is_active ? "bg-gold" : "bg-muted-foreground/30"} relative`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card transition-transform ${s.is_active ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the "{s.title}" service.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(s.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-card-foreground">{editing ? "Edit Service" : "New Service"}</h2>
              <button onClick={() => setModal(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Title *" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.icon} onChange={(e) => update("icon", e.target.value)} placeholder="Icon name" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
                <input type="number" value={form.sort_order} onChange={(e) => update("sort_order", parseInt(e.target.value) || 0)} placeholder="Sort order" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              </div>
              <label className="flex items-center gap-2 text-sm text-card-foreground">
                <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="accent-gold" /> Active
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
