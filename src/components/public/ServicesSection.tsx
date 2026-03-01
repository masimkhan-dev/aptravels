import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plane, FileCheck, Hotel, MapPin, ShieldCheck, Loader2, Calendar, Award,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  plane: Plane,
  "file-check": FileCheck,
  hotel: Hotel,
  "map-pin": MapPin,
  "shield-check": ShieldCheck,
  calendar: Calendar,
  award: Award,
  kaaba: Plane, // fallback
};

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function ServicesSection() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, description, icon")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as Service[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <section id="services" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-2">
            What We Offer
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            Our Services
          </h2>
          <p className="text-muted-foreground mt-1" dir="rtl">ہماری خدمات</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services?.map((s, i) => {
              const Icon = iconMap[s.icon] || Plane;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 border border-border"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gold-gradient group-hover:shadow-gold transition-all">
                    <Icon className="w-6 h-6 text-primary group-hover:text-secondary transition-colors" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-card-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {s.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
