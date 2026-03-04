import { motion } from "framer-motion";
import { Plane, ArrowDown } from "lucide-react";
import { AGENCY } from "@/lib/constants";
import heroBg from "@/assets/hero-bg.jpg";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: "easeOut" }}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/95" />

      <div className="relative z-10 container mx-auto px-4 text-center pt-24 md:pt-32">

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl sm:text-7xl md:text-[6rem] lg:text-[7.2rem] font-bold text-white leading-[1.05] tracking-tighter mb-6 sm:mb-8 drop-shadow-2xl"
        >
          Fulfill Your Sacred
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] filter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">Calling with Peace of Mind</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-gold/90 mb-10 sm:mb-12"
        >
          ✦ Trusted Since 2014 · Nowshera, KPK ✦
        </motion.p>


        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base sm:text-lg md:text-2xl text-white/80 mb-10 sm:mb-12 max-w-3xl mx-auto font-body leading-relaxed tracking-wide font-light px-4"
        >
          {AGENCY.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex justify-center"
        >
          <button
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            className="group relative overflow-hidden bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-black font-bold text-base sm:text-lg px-10 sm:px-12 py-5 lg:py-5 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all duration-300 transform hover:-translate-y-1"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Get a Free Consultation
              <Plane className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 h-full w-full bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </button>
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
