import { motion } from "framer-motion";
import { Crown, MessageCircle, Phone, ArrowRight } from "lucide-react";
import { AGENCY, WHATSAPP_URL, PHONE_URL } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { FadeUp } from "@/components/ui/MotionWrappers";

export default function VipCta() {
  const { data: contactData } = useSiteSettings("contact_info");
  const whatsappNumber = contactData?.whatsapp || AGENCY.whatsapp;
  const phone = contactData?.phones?.[0] || AGENCY.phones[0];
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const phoneUrl = `tel:${phone}`;

  return (
    <section className="vip-section py-20 md:py-28">
      {/* Floating gold orb */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
        style={{ background: "hsl(43 78% 46% / 0.08)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 right-0 w-96 h-96 rounded-full blur-[140px] pointer-events-none"
        style={{ background: "hsl(218 75% 36% / 0.12)" }}
      />

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp>
            {/* VIP Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border mb-8"
              style={{ borderColor: "hsl(43 78% 46% / 0.3)", background: "hsl(43 78% 46% / 0.08)" }}>
              <Crown className="w-4 h-4 text-gold" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gold">
                Concierge &amp; VIP Service
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
              Bespoke Travel,{" "}
              <span className="text-gradient-gold">Personally Arranged</span>
            </h2>

            <p className="text-lg text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Skip the wait. Talk directly to our senior travel specialist for Hajj, Umrah, VIP packages,
              or corporate group bookings — all customised to your exact needs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <motion.a
                href={`${whatsappUrl}?text=${encodeURIComponent("Assalam-o-Alaikum! Mujhe VIP / Concierge travel planning ki zaroorat hai.")}`}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-gold px-10 py-5 rounded-2xl flex items-center gap-3 text-base font-black shadow-gold-lg w-full sm:w-auto"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp Consultant
                <ArrowRight className="w-4 h-4" />
              </motion.a>

              <motion.a
                href={phoneUrl}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-ghost-light px-10 py-5 rounded-2xl flex items-center gap-3 text-base font-bold w-full sm:w-auto"
              >
                <Phone className="w-5 h-5" />
                Call: {phone}
              </motion.a>
            </div>

            {/* Trust micro-line */}
            <p className="mt-10 text-xs text-white/30 font-medium tracking-widest uppercase">
              Available Mon–Sat · 9am–9pm PKT · Nowshera KPK
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
