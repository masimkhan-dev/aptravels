import { motion } from "framer-motion";

const airlineLogos = [
    { name: "Gulf Air", logo: "https://pics.avs.io/200/80/GF.png" },
    { name: "Emirates", logo: "https://pics.avs.io/200/80/EK.png" },
    { name: "Oman Air", logo: "https://pics.avs.io/200/80/WY.png" },
    { name: "Saudia", logo: "https://pics.avs.io/200/80/SV.png" },
    { name: "Qatar Airways", logo: "https://pics.avs.io/200/80/QR.png" },
    { name: "PIA", logo: "https://pics.avs.io/200/80/PK.png" },
    { name: "Etihad", logo: "https://pics.avs.io/200/80/EY.png" },
    { name: "Air Arabia", logo: "https://pics.avs.io/200/80/G9.png" },
    { name: "Fly Dubai", logo: "https://pics.avs.io/200/80/FZ.png" },
    { name: "Turkish Airlines", logo: "https://pics.avs.io/200/80/TK.png" },
];

export default function AirlinesSection() {
    return (
        <div className="bg-muted/30 py-12 overflow-hidden border-y border-border/50">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="relative"
                >
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] uppercase text-center mb-8 sm:mb-10">
                        Official Ticketing Partners
                    </p>

                    <div className="mask-fade-edges py-2">
                        <div className="flex animate-marquee whitespace-nowrap gap-6 sm:gap-10 items-center">
                            {[...airlineLogos, ...airlineLogos].map((airline, index) => (
                                <div
                                    key={`${airline.name}-${index}`}
                                    className="inline-flex flex-col items-center justify-center gap-2 min-w-[110px] sm:min-w-[140px] group cursor-pointer"
                                >
                                    <div className="bg-card border border-border/50 rounded-2xl px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-center w-full aspect-[2/1] shadow-sm group-hover:shadow-md group-hover:border-gold/40 transition-all duration-300">
                                        <img
                                            src={airline.logo}
                                            alt={airline.name}
                                            className="w-16 sm:w-20 h-auto object-contain transition-all duration-500"
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                                const span = e.currentTarget.nextElementSibling as HTMLElement;
                                                if (span) span.style.display = "block";
                                            }}
                                        />
                                        <span className="hidden text-[8px] text-muted-foreground uppercase">{airline.name}</span>
                                    </div>
                                    <span className="text-[9px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.2em] text-center font-medium group-hover:text-gold transition-colors duration-300">
                                        {airline.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10">
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" /> Official Ticketing Partners
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" /> Competitive & Negotiated Fares
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" /> Direct & Connecting Flights
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
