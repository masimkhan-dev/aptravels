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
      <div className={`mx-auto transition-all duration-500 ease-out ${scrolled ? "container max-w-6xl px-4 pointer-events-auto" : "container px-4"}`}>
        <div className={`flex items-center justify-between transition-all duration-500 ${scrolled
          ? "bg-black/50 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-full px-4 sm:px-6 md:px-8 py-2 md:py-3"
          : "px-2 py-0"
          }`}>
          <button onClick={() => handleNavClick("/", true)} className="flex items-center gap-3 group">
            <div className={`rounded-full flex shrink-0 items-center justify-center bg-white/5 border border-white/10 shadow-lg overflow-hidden relative transition-all duration-500 group-hover:border-gold/60 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] ${scrolled ? "w-10 h-10 md:w-12 md:h-12" : "w-14 h-14 md:w-16 md:h-16"
              }`}>
              <img src="/logo-main.png" alt="Akbar Pura Logo" className="w-[110%] h-[110%] object-cover mix-blend-multiply contrast-125 scale-110" />
            </div>
            <div className="hidden sm:flex flex-col items-start text-left">
              <p className={`font-display font-bold text-white leading-tight tracking-wide transition-all duration-500 ${scrolled ? "text-sm md:text-base" : "text-base md:text-lg"
                }`}>
                Akbar Pura Int'l
              </p>
              <p className={`text-gold tracking-[0.2em] uppercase font-medium transition-all duration-500 ${scrolled ? "text-[8px] md:text-[9px]" : "text-[10px]"
                }`}>
                Travels &amp; Tours
              </p>
            </div>
          </button>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((l) => (
              l.isInternal ? (
                <button
                  key={l.href}
                  onClick={() => handleNavClick(l.href, true)}
                  className="group relative flex items-center gap-2 text-[13px] lg:text-[14px] font-medium tracking-wider text-white/80 hover:text-gold transition-colors duration-300 py-2"
                >
                  <l.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                  {l.label}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-gold-light via-gold to-gold-dark rounded-full transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                </button>
              ) : (
                <Link
                  key={l.href}
                  to={l.href}
                  className="group relative flex items-center gap-2 text-[13px] lg:text-[14px] font-medium tracking-wider text-white/80 hover:text-gold transition-colors duration-300 py-2"
                >
                  <l.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                  {l.label}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-gold-light via-gold to-gold-dark rounded-full transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                </Link>
              )
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white hover:text-gold transition-colors p-2"
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
