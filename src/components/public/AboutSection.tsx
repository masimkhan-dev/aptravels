import { motion } from "framer-motion";
import { AGENCY } from "@/lib/constants";

const stats = [
    { label: "Years of Service", value: "10+" },
    { label: "Happy Pilgrims", value: "5,000+" },
    { label: "Airline Partners", value: "6" },
    { label: "Services Offered", value: "8" },
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
                        About Us
                    </h2>
                    <p className="text-muted-foreground mt-1" dir="rtl">ہمارے بارے میں</p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto items-center">
                    {/* Stats grid (Shown first on mobile) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-2 gap-3 sm:gap-6 order-2 lg:order-1"
                    >
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="bg-card rounded-2xl border border-border p-5 sm:p-8 text-center shadow-sm hover:shadow-md transition-shadow"
                            >
                                <p className="font-display text-2xl sm:text-4xl font-bold text-gold mb-1">
                                    {s.value}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">{s.label}</p>
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
                            Akbar Pura International Travels &amp; Tours has been serving pilgrims,
                            travelers, and families from Nowshera and across KPK for years.
                            Based in the heart of Akbar Pura, we are a trusted name for Hajj
                            &amp; Umrah packages, international airline ticketing, and complete
                            visa processing services.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                            Under the leadership of{" "}
                            <span className="text-foreground font-semibold">Shahab Khan</span>,
                            our team is committed to making your travel experience seamless,
                            affordable, and spiritually fulfilling. We work directly with top
                            airlines — Gulf Air, Emirates, Saudia, Qatar Airways, PIA, and Oman
                            Air — to bring you the most competitive fares.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
