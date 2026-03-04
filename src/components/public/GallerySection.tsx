import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
    id: string;
    image_url: string;
    alt: string;
    category: string;
    created_at?: string;
}


export default function GallerySection() {
    const [selected, setSelected] = useState<GalleryImage | null>(null);

    // Fetch Images
    const { data: images = [], isLoading } = useQuery({
        queryKey: ["gallery", "public"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("gallery")
                .select("id, image_url, alt, category, created_at")
                .eq("is_active", true)
                .order("sort_order");
            if (error) throw error;
            return (data as GalleryImage[]);
        },
        staleTime: 1000 * 60 * 5,
    });

    return (
        <section id="gallery" className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <p className="section-label mb-2">
                        Stay Updated
                    </p>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                        Latest Offers &amp; Notifications
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm" dir="rtl">تازہ ترین آفرز اور اعلانات</p>
                </motion.div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gold" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && images.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                        No active offers at the moment. Check back soon!
                    </div>
                )}

                {/* Image Grid */}
                {!isLoading && images.length > 0 && (
                    <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
                    >
                        <AnimatePresence mode="popLayout">
                            {images.map((img) => (
                                <motion.button
                                    key={img.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => setSelected(img)}
                                    className="relative aspect-square overflow-hidden rounded-2xl group shadow-card hover:shadow-card-hover transition-all duration-300"
                                >
                                    <img
                                        src={img.image_url}
                                        alt={img.alt}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <div className="flex flex-col gap-1 w-full">
                                            <span className="text-white text-[11px] font-bold uppercase tracking-tight line-clamp-1">
                                                {img.alt}
                                            </span>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gold text-[9px] font-black uppercase tracking-wider">{img.category}</span>
                                                <span className="text-white/70 text-[9px] font-semibold">Details »</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* New Badge Logic */}
                                    {img.created_at && (new Date().getTime() - new Date(img.created_at).getTime()) < (1000 * 60 * 60 * 24 * 7) && (
                                        <div className="badge-new absolute top-2.5 right-2.5 z-10 uppercase">
                                            NEW
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* Lightbox */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <button
                        onClick={() => setSelected(null)}
                        className="absolute top-4 right-4 text-white hover:text-gold transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selected.image_url.replace("w=600", "w=1200")}
                        alt={selected.alt}
                        className="max-w-full max-h-[75vh] rounded-xl object-contain shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="mt-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white font-bold text-base md:text-xl">{selected.alt}</h3>
                        <a
                            href={`https://wa.me/923163050602?text=Assalam-o-Alaikum, I am interested in this offer: ${selected.alt} (${selected.category})`}
                            target="_blank"
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl animate-bounce"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.139c1.52.907 3.391 1.397 5.576 1.398 5.233 0 9.493-4.259 9.495-9.493.002-5.233-4.258-9.494-9.493-9.494-2.539 0-4.925 1.001-6.72 2.797-1.794 1.796-2.78 4.181-2.782 6.721-.001 2.105.566 4.162 1.641 5.918l-1.012 3.693 3.795-1.096zm12.423-6.224c-.269-.134-1.593-.787-1.841-.875-.247-.088-.427-.132-.607.135-.179.266-.695.875-.853 1.058-.157.183-.314.206-.584.072-.269-.134-1.138-.419-2.167-1.338-.801-.715-1.342-1.597-1.499-1.866-.157-.269-.017-.414.118-.548.121-.121.269-.314.404-.471.134-.157.179-.269.269-.449.09-.179.045-.337-.022-.471-.067-.134-.607-1.462-.831-2.001-.219-.524-.439-.453-.603-.461-.157-.008-.337-.01-.517-.01-.179 0-.471.067-.719.337-.247.269-.944.921-.944 2.246s.966 2.605 1.101 2.785c.134.179 1.902 2.903 4.606 4.069.643.277 1.146.443 1.536.567.646.205 1.233.176 1.697.107.517-.077 1.593-.651 1.819-1.279.225-.628.225-1.167.157-1.279-.068-.112-.247-.179-.517-.313z" /></svg>
                            Inquire via WhatsApp
                        </a>
                    </div>
                </div>
            )}
        </section>
    );
}
