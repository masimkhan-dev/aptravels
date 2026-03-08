import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, ArrowUp, Facebook } from "lucide-react";
import { WHATSAPP_URL, PHONE_URL, FACEBOOK_URL } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { AGENCY } from "@/lib/constants";

export default function FloatingButtons() {
  const { data: contactData } = useSiteSettings("contact_info");
  const [showScroll, setShowScroll] = useState(false);

  const facebook = contactData?.facebook || FACEBOOK_URL;
  const whatsappNumber = contactData?.whatsapp || AGENCY.whatsapp;
  const phone = contactData?.phones?.[0] || AGENCY.phones[0];

  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const phoneUrl = `tel:${phone}`;

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {showScroll && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:bg-navy-light transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full bg-[#1877F2] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Facebook"
      >
        <Facebook className="w-5 h-5" />
      </a>

      <a
        href={phoneUrl}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <Phone className="w-5 h-5" />
      </a>

      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-14 h-14 rounded-full bg-[#25D366] text-primary-foreground shadow-lg flex items-center justify-center group relative"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 text-white text-xs whitespace-nowrap rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Chat with us</span>
      </motion.a>

      <motion.a
        href="https://whatsapp.com/channel/0029Vb6aNCv2UPB9K7mDCP3k"
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-full bg-white border-2 border-[#25D366] text-[#25D366] shadow-lg flex items-center justify-center group relative hover:bg-[#25D366] hover:text-white transition-all overflow-hidden"
      >
        <MessageCircle className="w-6 h-6 mr-[-5px]" />
        <span className="text-[10px] font-bold ml-1">New</span>
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 text-white text-[11px] font-semibold whitespace-nowrap rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Follow our Channel</span>
      </motion.a>
    </div>
  );
}
