import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Plane, Home, Info, Briefcase, MapPin, Image, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENCY } from "@/lib/constants";

const navLinks = [
  { label: "Home", href: "/", isInternal: true, icon: Home },
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "About", href: "/#about", isInternal: true, icon: Info },
  { label: "Services", href: "/#services", isInternal: true, icon: Briefcase },
  { label: "Packages", href: "/#packages", isInternal: true, icon: MapPin },
  { label: "Latest Offers", href: "/#gallery", isInternal: true, icon: Image },
  { label: "Contact", href: "/#contact", isInternal: true, icon: Phone },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string, isInternal?: boolean) => {
    setMobileOpen(false);

    if (isInternal) {
      const sectionId = href.split("#")[1];
      const targetElement = sectionId ? document.getElementById(sectionId) : null;

      if (window.location.pathname === "/" && targetElement) {
        // Already on home, just scroll
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetElement.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      } else {
        // Navigate to home with fragment if needed
        window.location.href = href;
      }
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${scrolled
        ? "pt-4 pb-2 pointer-events-none"
        : "py-4 md:py-6"
        }`}
    >
      <div className={`mx-auto transition-all duration-500 ease-out ${scrolled ? "container max-w-7xl px-4 pointer-events-auto" : "container px-4"}`}>
        <div className={`flex items-center justify-between transition-all duration-500 ${scrolled
          ? "bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] px-6 md:px-10 py-3"
          : "px-2 py-2"
          }`}>
          <button onClick={() => handleNavClick("/", true)} className="flex items-center gap-4 group">
            <div className={`rounded-2xl flex shrink-0 items-center justify-center bg-white/5 border border-white/10 shadow-2xl overflow-hidden relative transition-all duration-500 group-hover:border-gold/60 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] ${scrolled ? "w-12 h-12" : "w-16 h-16 md:w-20 md:h-20"
              }`}>
              <img src="/logo-main.png" alt="Akbar Pura Logo" className="w-[115%] h-[115%] object-cover mix-blend-multiply contrast-125 scale-110" />
            </div>
            <div className={`flex flex-col items-start text-left transition-all duration-500 ${scrolled ? "opacity-100" : "opacity-100"}`}>
              <p className={`font-display font-black text-white leading-none tracking-tight transition-all duration-500 ${scrolled ? "text-base" : "text-xl md:text-2xl"
                }`}>
                Akbar Pura Int'l
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px w-4 bg-gold/50" />
                <p className={`text-gold tracking-[0.25em] uppercase font-bold transition-all duration-500 ${scrolled ? "text-[8px]" : "text-[10px] md:text-[11px]"
                  }`}>
                  Travels &amp; Tours
                </p>
              </div>
            </div>
          </button>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((l) => (
              l.isInternal ? (
                <button
                  key={l.href}
                  onClick={() => handleNavClick(l.href, true)}
                  className="group relative flex items-center gap-2.5 text-[14px] font-bold tracking-widest text-white/70 hover:text-gold transition-all duration-300 py-3 uppercase"
                >
                  <l.icon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:scale-110 group-hover:text-gold transition-all duration-300" />
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gold rounded-full transition-all duration-500 group-hover:w-full shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                </button>
              ) : (
                <Link
                  key={l.href}
                  to={l.href}
                  className="group relative flex items-center gap-2.5 text-[14px] font-bold tracking-widest text-white/70 hover:text-gold transition-all duration-300 py-3 uppercase"
                >
                  <l.icon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:scale-110 group-hover:text-gold transition-all duration-300" />
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gold rounded-full transition-all duration-500 group-hover:w-full shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                </Link>
              )
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white hover:text-gold transition-colors p-3 bg-white/5 rounded-xl border border-white/10"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="md:hidden absolute top-full left-4 right-4 mt-2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="px-3 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                l.isInternal ? (
                  <button
                    key={l.href}
                    onClick={() => handleNavClick(l.href, true)}
                    className="flex items-center gap-4 text-left text-white/90 hover:text-gold hover:bg-white/5 py-3 px-4 rounded-xl border-l-[3px] border-transparent hover:border-gold transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                      <l.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm tracking-wide">{l.label}</span>
                  </button>
                ) : (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-4 text-left text-white/90 hover:text-gold hover:bg-white/5 py-3 px-4 rounded-xl border-l-[3px] border-transparent hover:border-gold transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                      <l.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm tracking-wide">{l.label}</span>
                  </Link>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
