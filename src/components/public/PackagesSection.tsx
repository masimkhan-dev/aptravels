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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages?.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group rounded-2xl bg-card gold-border shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-350 overflow-hidden"
              >
                {pkg.is_popular && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-gold-gradient text-secondary text-xs font-bold shadow-gold">
                    <Star className="w-3 h-3" /> Popular
                  </div>
                )}

                <div className="bg-hero-gradient p-6 pb-8">
                  <h3 className="font-display text-xl font-bold text-primary-foreground mb-1">
                    {pkg.title}
                  </h3>
                  <div className="flex items-center gap-3 text-primary-foreground/60 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {pkg.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {pkg.duration}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {pkg.description}
                  </p>

                  {pkg.inclusions && pkg.inclusions.length > 0 && (
                    <ul className="space-y-1.5 mb-6">
                      {pkg.inclusions.map((inc) => (
                        <li key={inc} className="flex items-center gap-2 text-sm text-card-foreground">
                          <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                      <p className="font-display text-2xl font-bold text-gradient-gold">
                        {formatPrice(pkg.price)}
                      </p>
                    </div>
                    <a
                      href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Assalam-o-Alaikum Akbar Pura Travels! Mujhe ${pkg.title} package ki details chahiye.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold px-5 py-2.5 rounded-xl text-sm"
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
