import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Plus, Edit2, Trash2, Star, Loader2, X } from "lucide-react";
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

interface Pkg {
  id: string;
  title: string;
  description: string;
  destination: string;
  price: number;
  duration: string;
  is_popular: boolean;
  is_active: boolean;
  inclusions: string[];
}

const empty: Omit<Pkg, "id"> = {
  title: "", description: "", destination: "", price: 0, duration: "",
  is_popular: false, is_active: true, inclusions: [],
};

export default function AdminPackages() {
  const { role } = useRole();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [inclusionsText, setInclusionsText] = useState("");

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setInclusionsText("");
    setModal(true);
  };

  const openEdit = (p: Pkg) => {
    setEditing(p);
    setForm({
      title: p.title, description: p.description, destination: p.destination,
      price: p.price, duration: p.duration, is_popular: p.is_popular,
      is_active: p.is_active, inclusions: p.inclusions,
    });
    setInclusionsText((p.inclusions || []).join(", "));
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.destination || !form.price) return;
    setSaving(true);
    const payload = {
      ...form,
      inclusions: inclusionsText.split(",").map((s) => s.trim()).filter(Boolean),
    };

    if (editing) {
      await supabase.from("packages").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("packages").insert(payload);
    }
    setSaving(false);
    setModal(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("packages").delete().eq("id", id);
    fetchPackages();
  };

  const togglePopular = async (p: Pkg) => {
    await supabase.from("packages").update({ is_popular: !p.is_popular }).eq("id", p.id);
    fetchPackages();
  };

  const toggleActive = async (p: Pkg) => {
    await supabase.from("packages").update({ is_active: !p.is_active }).eq("id", p.id);
    fetchPackages();
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{packages.length} packages</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Destination</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-center">Popular</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((p) => (
                <tr key={p.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-card-foreground">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.destination}</td>
                  <td className="px-4 py-3 text-muted-foreground">PKR {Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.duration}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => togglePopular(p)} className={`p-1 rounded ${p.is_popular ? "text-gold" : "text-muted-foreground/30"}`}>
                      <Star className="w-4 h-4" fill={p.is_popular ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`w-10 h-5 rounded-full transition-colors ${p.is_active ? "bg-gold" : "bg-muted-foreground/30"} relative`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card transition-transform ${p.is_active ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></button>

                      {role === 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Package?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the "{p.title}" package.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(p.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-card-foreground">
                {editing ? "Edit Package" : "New Package"}
              </h2>
              <button onClick={() => setModal(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Title *" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              <input value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Destination *" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.price} onChange={(e) => update("price", parseFloat(e.target.value) || 0)} placeholder="Price *" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" onWheel={e => e.currentTarget.blur()} />
                <input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="Duration" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              </div>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold resize-none" />
              <input value={inclusionsText} onChange={(e) => setInclusionsText(e.target.value)} placeholder="Inclusions (comma separated)" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-card-foreground">
                  <input type="checkbox" checked={form.is_popular} onChange={(e) => update("is_popular", e.target.checked)} className="accent-gold" /> Popular
                </label>
                <label className="flex items-center gap-2 text-sm text-card-foreground">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="accent-gold" /> Active
                </label>
              </div>
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
