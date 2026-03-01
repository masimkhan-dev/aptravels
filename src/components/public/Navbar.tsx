import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Plane, Home, Info, Briefcase, MapPin, Image, Phone, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENCY } from "@/lib/constants";

const navLinks = [
  { label: "Home", href: "#home", icon: Home },
  { label: "About", href: "#about", icon: Info },
  { label: "Services", href: "#services", icon: Briefcase },
  { label: "Packages", href: "#packages", icon: MapPin },
  { label: "Gallery", href: "#gallery", icon: Image },
  { label: "Contact", href: "#contact", icon: Phone },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-secondary/95 backdrop-blur-md shadow-lg"
        : "bg-transparent"
        }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
        <button onClick={() => scrollTo("#home")} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center">
            <Plane className="w-5 h-5 text-secondary" />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-sm font-bold text-primary-foreground leading-tight">
              Akbar Pura Int'l
            </p>
            <p className="text-[10px] text-gold-light tracking-wider uppercase">
              Travels & Tours
            </p>
          </div>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="group flex items-center gap-2 text-sm font-medium text-primary-foreground/80 hover:text-gold transition-colors"
            >
              <l.icon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              {l.label}
            </button>
          ))}
          <Link
            to="/admin/login"
            className="flex items-center gap-1 text-xs text-primary-foreground/40 hover:text-primary-foreground/60 transition-colors border-l border-primary-foreground/10 pl-6 ml-2"
          >
            <User className="w-3.5 h-3.5" />
            Admin
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-primary-foreground"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-secondary/95 backdrop-blur-md border-t border-primary-foreground/10"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {navLinks.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="flex items-center gap-3 text-left text-primary-foreground/80 hover:text-gold py-2.5 px-4 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <l.icon className="w-5 h-5 opacity-70" />
                  <span className="font-medium text-sm">{l.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
