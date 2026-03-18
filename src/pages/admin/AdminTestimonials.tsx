import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2, CheckCircle2, XCircle, Plus, Star, MapPin, Tag, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  text: string;
  tag: string | null;
  initials: string | null;
  is_published: boolean;
  created_at: string;
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    rating: 5,
    text: "",
    tag: "",
    initials: ""
  });

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await (supabase
        .from("testimonials" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      
      if (error) throw error;
      setTestimonials((data as any) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const togglePublish = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("testimonials" as any)
      .update({ is_published: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(currentStatus ? "Testimonial hidden." : "Testimonial published!");
      fetchTestimonials();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("testimonials" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Delete failed.");
    } else {
      toast.success("Deleted successfully.");
      fetchTestimonials();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const initials = formData.initials || formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const { error } = await supabase
      .from("testimonials" as any)
      .insert([{
        ...formData,
        initials,
        is_published: true // Admin added ones are published by default
      }]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Testimonial added.");
      setShowAdd(false);
      setFormData({ name: "", location: "", rating: 5, text: "", tag: "", initials: "" });
      fetchTestimonials();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Client Testimonials</h2>
          <p className="text-muted-foreground text-sm">Manage what appears in the "What Our Clients Say" section.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-gold hover:bg-gold/90 text-white font-bold gap-2">
          <Plus className="w-4 h-4" /> Add Testimonial
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div key={t.id} className={`bg-card rounded-2xl border ${t.is_published ? 'border-border' : 'border-amber-500/30 bg-amber-50/5'} p-6 shadow-sm relative overflow-hidden group transition-all`}>
            {!t.is_published && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                Pending Approval
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center text-white font-black text-xs">
                {t.initials}
              </div>
              <div>
                <h4 className="font-bold text-foreground leading-none">{t.name}</h4>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                   <MapPin className="w-2.5 h-2.5" /> {t.location || 'Unknown Location'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < t.rating ? 'text-gold fill-gold' : 'text-muted-foreground/20'}`} />
              ))}
              {t.tag && (
                <span className="ml-2 text-[9px] font-black uppercase text-gold/80 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> {t.tag}
                </span>
              )}
            </div>

            <p className="text-sm text-foreground/80 italic line-clamp-4 mb-6 leading-relaxed">
              "{t.text}"
            </p>

            <div className="flex items-center gap-2 pt-4 border-t border-border/50">
              <Button 
                variant={t.is_published ? "outline" : "default"}
                size="sm"
                className={`flex-1 h-9 font-bold text-xs gap-2 ${t.is_published ? 'border-border' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                onClick={() => togglePublish(t.id, t.is_published)}
              >
                {t.is_published ? <><XCircle className="w-3.5 h-3.5" /> Hide</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Approve & Publish</>}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => { if(confirm("Are you sure?")) handleDelete(t.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {testimonials.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
             <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <p className="text-muted-foreground font-medium">No testimonials found. Add your first one!</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl">
          <form onSubmit={handleAdd}>
            <div className="p-6 bg-secondary/50 border-b border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-display">New Testimonial</DialogTitle>
                <p className="text-xs text-muted-foreground">Add a client's feedback manually to show it on the site.</p>
              </DialogHeader>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Client Name</label>
                  <Input placeholder="Tariq Mehmood" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Location</label>
                  <Input placeholder="Mardan, KPK" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Service Tag</label>
                  <Input placeholder="International Flight" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Rating (1-5)</label>
                  <Input type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Feedback Message</label>
                <Textarea placeholder="Gulf Air ka ticket book karaya tha..." className="min-h-[100px]" required value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} />
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t border-border mt-0">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-gold hover:bg-gold/90 text-white font-black px-8">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
