import { Plane, Facebook, MessageCircle } from "lucide-react";
import { AGENCY } from "@/lib/constants";
import { FACEBOOK_URL, WHATSAPP_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="relative bg-secondary text-secondary-foreground py-14 border-t border-gold/20 overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-30" />
      <div className="relative z-10 container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5 group cursor-default">
            <div className="w-14 h-14 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform duration-300">
              <Plane className="w-7 h-7 text-secondary" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight tracking-wide">
                {AGENCY.name}
              </p>
              <p className="text-[11px] text-secondary-foreground/60 tracking-wider">
                {AGENCY.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-5">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-secondary-foreground/50 hover:text-gold hover:bg-gold/10 hover:border-gold/30 hover:shadow-gold-sm hover:-translate-y-1 transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-secondary-foreground/50 hover:text-[#25D366] hover:bg-[#25D366]/10 hover:border-[#25D366]/30 hover:shadow-[0_4px_16px_rgba(37,211,102,0.3)] hover:-translate-y-1 transition-all duration-300"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
            <p className="text-[11px] text-secondary-foreground/40 uppercase tracking-[0.15em] font-medium">
              © {new Date().getFullYear()} {AGENCY.name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
