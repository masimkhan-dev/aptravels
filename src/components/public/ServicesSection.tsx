import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plane, FileCheck, Hotel, MapPin, ShieldCheck, Calendar, Award,
} from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/ui/MotionWrappers";

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
          <p className="section-label mb-2">
            What We Offer
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Our Services
          </h2>
          <p className="text-muted-foreground mt-2 text-sm" dir="rtl">ہماری خدمات</p>
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="group p-7 rounded-2xl bg-card shadow-card gold-border animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-muted mb-5" />
                <div className="h-5 w-2/3 bg-muted rounded-lg mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-5/6 bg-muted rounded" />
                  <div className="h-3 w-4/6 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" delay={0.1}>
            {services?.map((s) => {
              const Icon = iconMap[s.icon] || Plane;
              return (
                <StaggerItem key={s.id}>
                  <div className="group p-7 rounded-2xl bg-card shadow-card hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 gold-border h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-gold-gradient group-hover:shadow-gold group-hover:scale-110 transition-all duration-300">
                      <Icon className="w-6 h-6 text-primary group-hover:text-secondary transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-card-foreground mb-2 tracking-tight group-hover:text-gold transition-colors duration-300">
                      {s.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}
