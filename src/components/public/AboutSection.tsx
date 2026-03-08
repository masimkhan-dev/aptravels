import { motion } from "framer-motion";
import { AGENCY } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DEFAULT_STATS = [
    { label: "Years of Experience", value: "10+" },
    { label: "Happy Pilgrims", value: "Satisfied" },
    { label: "Trusted Travel Office", value: "Nowshera" },
];

const DEFAULT_FEATURES = [
    "Clear and honest pricing",
    "Personal support at every step",
    "Complete documentation assistance",
    "Friendly and experienced staff",
];

export default function AboutSection() {
    const { data: aboutData } = useSiteSettings("about_section");

    const title = aboutData?.title || "Serving Pilgrims Since 2019";
    const description = aboutData?.description || `Akbar Pura International Travels & Tours has been serving people of Nowshera and nearby areas since 2019. We help families plan their Hajj and Umrah trips, book airline tickets, and process visas — without the stress.`;
    const stats = aboutData?.stats || DEFAULT_STATS;
    const features = aboutData?.features || DEFAULT_FEATURES;

    return (
        <section id="about" className="py-20 md:py-28 bg-[#F9FAFB]">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <p className="section-label mb-2">
                        Who We Are
                    </p>
                    <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                        {title}
                    </h2>
                    <p className="text-muted-foreground mt-2 italic text-sm md:text-base opacity-80" dir="rtl">دیانتداری کے ساتھ خدمت — ۲۰۱۹ سے</p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto items-start">
                    {/* Left Column: Text content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <h3 className="font-display text-3xl font-bold text-foreground border-l-4 border-gold pl-5">
                                {AGENCY.name}
                            </h3>
                            <p className="text-muted-foreground leading-loose text-base md:text-lg whitespace-pre-line">
                                {description}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-muted-foreground leading-relaxed text-base">
                                Our office is at Madina Market, Akbar Pura. You can walk in and talk to
                                us directly. <span className="text-foreground font-bold border-b-2 border-gold/30">Shahab Khan</span> and our team take care of your paperwork, bookings, and arrangements
                                — so you can focus on your journey.
                            </p>
                            <p className="text-muted-foreground leading-relaxed text-base">
                                For tickets, we work with Emirates, Qatar Airways, Saudia,
                                Pakistan International Airlines, and Oman Air. We find the right
                                option based on your dates and budget.
                            </p>
                        </div>

                        {/* Feature Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 mt-4 border-t border-border/60">
                            {features.map((point: string) => (
                                <div key={point} className="flex items-center gap-3 group">
                                    <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gold-gradient transition-all duration-300">
                                        <span className="text-gold group-hover:text-secondary text-xs font-bold leading-none">✔</span>
                                    </div>
                                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{point}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Column: Stats grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                    >
                        {stats.map((s, idx) => (
                            <div
                                key={s.label}
                                className={`group bg-card rounded-2xl border border-border p-8 text-center shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 flex flex-col justify-center items-center min-h-[160px] ${idx === 2 ? 'sm:col-span-2' : ''}`}
                            >
                                <p className="font-display text-4xl font-black text-gradient-gold mb-3 leading-none group-hover:scale-110 transition-transform">
                                    {s.value}
                                </p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-tight max-w-[150px]">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
