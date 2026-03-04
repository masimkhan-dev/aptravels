import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, X, Eye, EyeOff, Settings2, Check, Upload } from "lucide-react";
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
import { toast } from "sonner";

interface GalleryItem {
    id: string;
    image_url: string;
    alt: string;
    category: string;
    is_active: boolean;
    sort_order: number;
}

interface GalleryCategory {
    id: string;
    name: string;
    label_urdu: string | null;
    sort_order: number;
}

const emptyPhoto = { image_url: "", alt: "", category: "General Offer", is_active: true, sort_order: 0 };
const emptyCat = { name: "", label_urdu: "", sort_order: 0 };

export default function AdminGallery() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [categories, setCategories] = useState<GalleryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [catModal, setCatModal] = useState(false);
    const [form, setForm] = useState(emptyPhoto);
    const [catForm, setCatForm] = useState(emptyCat);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterCat, setFilterCat] = useState("All");

    const fetchData = async () => {
        setLoading(true);
        const [galleryRes, catRes] = await Promise.all([
            (supabase as any).from("gallery").select("*").order("sort_order"),
            (supabase as any).from("gallery_categories").select("*").order("sort_order")
        ]);

        setItems((galleryRes.data as GalleryItem[]) || []);
        setCategories((catRes.data as GalleryCategory[]) || []);

        // Update default category if categories exist
        if (catRes.data && catRes.data.length > 0) {
            setForm(f => ({ ...f, category: catRes.data[0].name }));
        }

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `flyers/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            updatePhoto("image_url", publicUrl);
            toast.success("Image uploaded successfully");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSavePhoto = async () => {
        if (!form.image_url || !form.alt) return;
        setSaving(true);
        try {
            const { error } = await (supabase as any).from("gallery").insert(form);
            if (error) throw error;
            toast.success("Ad Flyer added to list");
            setModal(false);
            setForm({ ...emptyPhoto, category: categories[0]?.name || "Visas" });
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCategory = async () => {
        if (!catForm.name) return;
        setSaving(true);
        try {
            const { error } = await (supabase as any).from("gallery_categories").insert(catForm);
            if (error) throw error;
            toast.success("Category added successfully");
            setCatModal(false);
            setCatForm(emptyCat);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePhoto = async (id: string) => {
        await (supabase as any).from("gallery").delete().eq("id", id);
        toast.success("Photo deleted");
        fetchData();
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        // Check if any photos use this category
        const inUse = items.some(item => item.category === name);
        if (inUse) {
            toast.error(`Cannot delete category "${name}" because it is being used by some photos.`);
            return;
        }
        await (supabase as any).from("gallery_categories").delete().eq("id", id);
        toast.success("Category deleted");
        fetchData();
    };

    const toggleActive = async (item: GalleryItem) => {
        await (supabase as any).from("gallery").update({ is_active: !item.is_active }).eq("id", item.id);
        fetchData();
    };

    const updatePhoto = (field: string, value: string | boolean | number) =>
        setForm((f) => ({ ...f, [field]: value }));

    const updateCat = (field: string, value: string | number) =>
        setCatForm((f) => ({ ...f, [field]: value }));

    const displayed = filterCat === "All" ? items : items.filter((i) => i.category === filterCat);

    if (loading)
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );

    return (
        <div className="space-y-8">
            {/* Gallery Management */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setFilterCat("All")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === "All"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCat(cat.name)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === cat.name
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCatModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
                        >
                            <Settings2 className="w-4 h-4" /> Manage Categories
                        </button>
                        <button
                            onClick={() => { setForm({ ...emptyPhoto, category: categories[0]?.name || "Visas" }); setModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-4 h-4" /> Add New Ad Flyer
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayed.map((item) => (
                        <div
                            key={item.id}
                            className={`relative group rounded-xl overflow-hidden border border-border bg-card shadow-card ${!item.is_active ? "opacity-50" : ""}`}
                        >
                            <img
                                src={item.image_url}
                                alt={item.alt}
                                className="w-full aspect-square object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-200 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={() => toggleActive(item)}
                                    className="p-2 rounded-full bg-card/90 text-card-foreground hover:bg-card transition-colors"
                                >
                                    {item.is_active ? <Eye className="w-4 h-4 text-gold" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="p-2 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                            <AlertDialogDescription>Permanently delete "{item.alt}"?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePhoto(item.id)} className="bg-destructive text-white">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground text-[9px] font-medium uppercase">{item.category}</div>
                            <div className="p-2 border-t border-border">
                                <p className="text-xs text-card-foreground truncate">{item.alt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Photo Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4">
                    <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-lg font-bold text-card-foreground">Post New Promotion</h2>
                            <button onClick={() => setModal(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Image *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={form.image_url}
                                        onChange={(e) => updatePhoto("image_url", e.target.value)}
                                        placeholder="Paste image URL..."
                                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold"
                                    />
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={uploading}
                                        />
                                        <button
                                            type="button"
                                            className="px-3 py-2 rounded-lg bg-muted text-foreground text-sm flex items-center gap-2 hover:bg-muted/80 transition-colors"
                                        >
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            Upload
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Paste a URL or upload a file from your computer.</p>
                            </div>
                            {form.image_url && (
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30">
                                    <img src={form.image_url} alt="preview" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Caption / Alt Text *</label>
                                <input value={form.alt} onChange={(e) => updatePhoto("alt", e.target.value)} placeholder="e.g. Masjid al-Haram, Makkah" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                                <select value={form.category} onChange={(e) => updatePhoto("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold">
                                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
                                <input type="number" value={form.sort_order} onChange={(e) => updatePhoto("sort_order", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-card-foreground">
                                <input type="checkbox" checked={form.is_active} onChange={(e) => updatePhoto("is_active", e.target.checked)} className="accent-gold" /> Active
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancel</button>
                            <button onClick={handleSavePhoto} disabled={saving || !form.image_url || !form.alt} className="px-5 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold flex items-center gap-2">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Post Advertisement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {catModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4">
                    <div className="bg-card rounded-2xl w-full max-w-2xl p-6 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="font-display text-lg font-bold text-card-foreground">Manage Categories</h2>
                            <button onClick={() => setCatModal(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 overflow-hidden">
                            {/* Form */}
                            <div className="w-full md:w-1/2 space-y-4 shrink-0">
                                <h3 className="text-sm font-semibold text-foreground">Add New Category</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Name (English)</label>
                                        <input value={catForm.name} onChange={(e) => updateCat("name", e.target.value)} placeholder="e.g. Office" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Urdu Label</label>
                                        <input value={catForm.label_urdu || ""} onChange={(e) => updateCat("label_urdu", e.target.value)} placeholder="e.g. دفتر" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm text-right outline-none focus:ring-2 focus:ring-gold" dir="rtl" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
                                        <input type="number" value={catForm.sort_order} onChange={(e) => updateCat("sort_order", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-gold" />
                                    </div>
                                    <button onClick={handleSaveCategory} disabled={saving || !catForm.name} className="w-full px-5 py-2 rounded-lg bg-gold-gradient text-secondary text-sm font-semibold shadow-gold flex items-center justify-center gap-2">
                                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Category
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="w-full md:w-1/2 overflow-y-auto pr-2 space-y-3">
                                <h3 className="text-sm font-semibold text-foreground">Existing Categories</h3>
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{cat.name}</p>
                                                <p className="text-[10px] text-muted-foreground" dir="rtl">{cat.label_urdu}</p>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                                        <AlertDialogDescription>Delete category "{cat.name}"?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCategory(cat.id, cat.name)} className="bg-destructive text-white">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
