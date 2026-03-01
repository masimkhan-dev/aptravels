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
}

interface GalleryCategory {
    id: string;
    name: string;
    label_urdu: string | null;
}

export default function GallerySection() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [selected, setSelected] = useState<GalleryImage | null>(null);

    // Fetch Categories
    const { data: categories = [], isLoading: loadingCats } = useQuery({
        queryKey: ["gallery-categories"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("gallery_categories")
                .select("*")
                .order("sort_order");
            if (error) throw error;
            return data as GalleryCategory[];
        },
    });

    // Fetch Images
    const { data: images = [], isLoading: loadingImages } = useQuery({
        queryKey: ["gallery", "public"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("gallery")
                .select("id, image_url, alt, category")
                .eq("is_active", true)
                .order("sort_order");
            if (error) throw error;
            return (data as GalleryImage[]);
        },
        staleTime: 1000 * 60 * 5,
    });

    const isLoading = loadingCats || loadingImages;

    const filtered =
        activeCategory === "All"
            ? images
            : images.filter((img) => img.category === activeCategory);

    return (
        <section id="gallery" className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-10"
                >
                    <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-2">
                        Our Journey
                    </p>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
                        Photo Gallery
                    </h2>
                    <p className="text-muted-foreground mt-1" dir="rtl">تصویری گیلری</p>
                </motion.div>

                {/* Category Tabs */}
                {!loadingCats && categories.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        <button
                            onClick={() => setActiveCategory("All")}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === "All"
                                ? "bg-gold-gradient text-secondary shadow-gold"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            All <span className="text-[10px] opacity-70" dir="rtl">تمام</span>
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.name)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === cat.name
                                    ? "bg-gold-gradient text-secondary shadow-gold"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                            >
                                {cat.name}{" "}
                                {cat.label_urdu && (
                                    <span className="text-[10px] opacity-70" dir="rtl">
                                        {cat.label_urdu}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                        No photos in this category yet.
                    </div>
                )}

                {/* Image Grid */}
                {!isLoading && filtered.length > 0 && (
                    <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {filtered.map((img) => (
                                <motion.button
                                    key={img.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => setSelected(img)}
                                    className="relative aspect-square overflow-hidden rounded-xl group"
                                >
                                    <img
                                        src={img.image_url}
                                        alt={img.alt}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end p-3">
                                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-left leading-tight">
                                            {img.alt}
                                        </span>
                                    </div>
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
                        className="max-w-full max-h-[85vh] rounded-xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm pointer-events-none">
                        {selected.alt}
                    </p>
                </div>
            )}
        </section>
    );
}
