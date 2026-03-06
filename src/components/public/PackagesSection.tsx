import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getPackages } from "@/integrations/supabase/packages";
import { MapPin, Clock, Check, Star, Loader2 } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/constants";

interface Package {
  id: string;
  title: string;
  description: string;
  destination: string;
  price: number;
  duration: string;
  is_popular: boolean;
  inclusions: string[];
}

export default function PackagesSection() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages", "public"],
    queryFn: getPackages,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(p);

  return (
    <section id="packages" className="py-20 md:py-28 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="section-label mb-2">
            Travel With Us
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Popular Packages
          </h2>
          <p className="text-muted-foreground mt-2 text-sm" dir="rtl">مشہور پیکجز</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {packages?.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col h-full group rounded-2xl bg-card gold-border shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-350 overflow-hidden"
              >
                {pkg.is_popular && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-gradient text-secondary text-[10px] font-black uppercase tracking-wider shadow-gold border border-white/20">
                    <Star className="w-3 h-3 fill-current" /> Popular
                  </div>
                )}

                <div className="bg-hero-gradient p-6 pb-8">
                  <h3 className="font-display text-xl font-bold text-primary-foreground mb-1 group-hover:text-gold transition-colors duration-300">
                    {pkg.title}
                  </h3>
                  <div className="flex items-center gap-3 text-primary-foreground/60 text-xs">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold" /> {pkg.destination}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gold" /> {pkg.duration}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                      {pkg.description}
                    </p>

                    {pkg.inclusions && pkg.inclusions.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-3">What's Included</p>
                        <ul className="space-y-2">
                          {pkg.inclusions.map((inc) => (
                            <li key={inc} className="flex items-center gap-2.5 text-sm text-card-foreground">
                              <div className="w-4 h-4 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                                <Check className="w-2.5 h-2.5 text-gold" />
                              </div>
                              <span className="line-clamp-1">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border mt-auto">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Starting From</p>
                      <p className="font-display text-2xl font-black text-gradient-gold tracking-tighter">
                        {formatPrice(pkg.price)}
                      </p>
                    </div>
                    <a
                      href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Assalam-o-Alaikum Akbar Pura Travels! Mujhe ${pkg.title} package ki details chahiye.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold px-6 py-3 rounded-xl text-sm btn-active-scale"
                    >
                      Book Now
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
