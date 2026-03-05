import { motion } from "framer-motion";
import { AGENCY } from "@/lib/constants";

const stats = [
    { label: "Years of Experience", value: "10+" },
    { label: "Happy Pilgrims", value: "Satisfied" },
    { label: "Trusted Travel Office", value: "Nowshera" },
];

export default function AboutSection() {
    return (
        <section id="about" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-14"
                >
                    <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-2">
                        Who We Are
                    </p>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
                        Serving Pilgrims Since 2019
                    </h2>
                    <p className="text-muted-foreground mt-1" dir="rtl">دیانتداری کے ساتھ خدمت — ۲۰۱۹ سے</p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto items-center">
                    {/* Stats grid (Shown first on mobile) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 order-2 lg:order-1"
                    >
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="bg-card rounded-2xl border border-border p-5 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center items-center min-h-[140px]"
                            >
                                <p className="font-display text-3xl sm:text-4xl font-bold text-gold mb-2 leading-none">
                                    {s.value}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-black leading-tight max-w-[120px]">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Text content */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6 order-1 lg:order-2"
                    >
                        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                            {AGENCY.name}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                            Akbar Pura International Travels & Tours has been serving people of
                            Nowshera and nearby areas since 2019. We help families plan their Hajj
                            and Umrah trips, book airline tickets, and process visas — without the stress.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                            Our office is at Madina Market, Akbar Pura. You can walk in and talk to
                            us directly.{" "}
                            <span className="text-foreground font-semibold">Shahab Khan</span>{" "}
                            and our team take care of your paperwork, bookings, and arrangements
                            — so you can focus on your journey.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                            For tickets, we work with Emirates, Qatar Airways, Saudia,
                            Pakistan International Airlines, and Oman Air. We find the right
                            option based on your dates and budget.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {[
                                "Clear and honest pricing",
                                "Personal support at every step",
                                "Complete documentation assistance",
                                "Friendly and experienced staff",
                            ].map((point) => (
                                <p key={point} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-gold font-bold mt-0.5">✔</span>
                                    {point}
                                </p>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
