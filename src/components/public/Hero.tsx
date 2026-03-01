import { motion } from "framer-motion";
import { Plane, ArrowDown } from "lucide-react";
import { AGENCY } from "@/lib/constants";
import heroBg from "@/assets/hero-bg.jpg";

const airlineLogos = [
  { name: "Gulf Air", logo: "https://pics.avs.io/200/80/GF.png" },
  { name: "Emirates", logo: "https://pics.avs.io/200/80/EK.png" },
  { name: "Oman Air", logo: "https://pics.avs.io/200/80/WY.png" },
  { name: "Saudia", logo: "https://pics.avs.io/200/80/SV.png" },
  { name: "Qatar Airways", logo: "https://pics.avs.io/200/80/QR.png" },
  { name: "PIA", logo: "https://pics.avs.io/200/80/PK.png" },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-85" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center bg-transparent border-[3px] border-gold/50 shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-float overflow-hidden relative">
            <img src="/logo.jpeg" alt="Akbar Pura Travel Logo" className="w-[110%] h-[110%] object-cover mix-blend-multiply brightness-110 contrast-125 scale-110" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-primary-foreground leading-tight mb-4"
        >
          {AGENCY.name.split("Travels")[0]}
          <br />
          <span className="text-gradient-gold">Travels & Tours</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <p className="font-body text-xl md:text-2xl text-gold" dir="rtl">
            حج، عمرہ، ٹکٹس، ورک اور سٹوڈنٹ ویزا سروسز
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto font-body"
        >
          {AGENCY.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => document.querySelector("#packages")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 rounded-lg bg-gold-gradient text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity"
          >
            Explore Packages
          </button>
          <button
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 rounded-lg border border-primary-foreground/30 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors"
          >
            Get In Touch
          </button>
        </motion.div>

        {/* Airline Partners strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16"
        >
          <p className="text-primary-foreground/40 text-xs uppercase tracking-widest text-center mb-5 font-body">
            Our Airline Partners
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto px-4">
            {airlineLogos.map((airline) => (
              <div
                key={airline.name}
                className="bg-white/95 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col items-center justify-center gap-1 w-[28%] sm:w-28 h-14 sm:h-16 shadow-md hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={airline.logo}
                  alt={airline.name}
                  className="w-12 sm:w-16 h-5 sm:h-7 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const span = e.currentTarget.nextElementSibling as HTMLElement;
                    if (span) span.style.display = "block";
                  }}
                />
                <span className="text-[7px] sm:text-[8px] text-gray-400 uppercase tracking-widest text-center truncate w-full">
                  {airline.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12"
        >
          <button
            onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
            className="text-primary-foreground/50 hover:text-gold transition-colors"
          >
            <ArrowDown className="w-6 h-6 animate-bounce" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
