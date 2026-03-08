import { Plane, Facebook, MessageCircle } from "lucide-react";
import { AGENCY } from "@/lib/constants";
import { FACEBOOK_URL, WHATSAPP_URL } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Footer() {
  const { data: contactData } = useSiteSettings("contact_info");

  const agencyName = contactData?.agencyName || AGENCY.name;
  const tagline = contactData?.tagline || AGENCY.tagline;
  const email = contactData?.email || AGENCY.email;
  const phone = contactData?.phones?.[0] || AGENCY.phones[0];
  const address = contactData?.address || AGENCY.address;
  const facebook = contactData?.facebook || FACEBOOK_URL;
  const whatsappNumber = contactData?.whatsapp || AGENCY.whatsapp;
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  return (
    <footer className="relative bg-secondary text-secondary-foreground py-20 border-t border-gold/10 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-hero-gradient opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-start">
          {/* Logo & Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold group-hover:scale-110 transition-all duration-500 border border-white/20">
                <Plane className="w-8 h-8 text-secondary group-hover:rotate-12 transition-transform" />
              </div>
              <div className="space-y-0.5">
                <p className="font-display text-xl md:text-2xl font-black leading-none tracking-tight">
                  {agencyName}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-gold" />
                  <p className="text-[10px] text-secondary-foreground/50 uppercase tracking-[0.2em] font-bold">
                    EST. 2019
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-secondary-foreground/60 leading-relaxed max-w-xs italic">
              {tagline}
            </p>
          </div>

          {/* Quick Links / Social Headline */}
          <div className="flex flex-col items-center text-center space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gold">Follow Our Journey</h4>
            <div className="flex items-center gap-6">
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-secondary-foreground/40 hover:text-gold hover:bg-gold/10 hover:border-gold/40 hover:shadow-gold hover:-translate-y-2 transition-all duration-500 group"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6 group-hover:scale-110" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-secondary-foreground/40 hover:text-[#25D366] hover:bg-[#25D366]/10 hover:border-[#25D366]/40 hover:shadow-[0_8px_32px_rgba(37,211,102,0.3)] hover:-translate-y-2 transition-all duration-500 group"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-6 h-6 group-hover:scale-110" />
              </a>
            </div>
          </div>

          {/* Contact Summary */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-4">
            <div className="p-1 px-4 rounded-full bg-gold/10 border border-gold/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-gold">Reach Out</p>
            </div>
            <p className="text-sm font-medium text-secondary-foreground/80 hover:text-gold transition-colors">{email}</p>
            <p className="text-sm font-medium text-secondary-foreground/80">{phone}</p>
            <p className="text-[11px] text-secondary-foreground/40 font-medium">{address}</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} {agencyName} — All Rights Reserved
          </p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            <span className="hover:text-gold transition-colors cursor-pointer">Privacy Policy</span>
            <div className="w-1 h-1 rounded-full bg-gold/50" />
            <span className="hover:text-gold transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
