import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { FadeUp } from "@/components/ui/MotionWrappers";

import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  text: string;
  tag: string | null;
  initials: string | null;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("testimonials" as any)
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      setTestimonials(data as any);
    }
    setLoading(false);
  };

  const startAutoPlay = () => {
    if (testimonials.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  useEffect(() => {
    if (testimonials.length > 1) {
      startAutoPlay();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [testimonials]);

  const go = (dir: 1 | -1) => {
    if (testimonials.length <= 1) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDirection(dir);
    setCurrent((prev) => (prev + dir + testimonials.length) % testimonials.length);
    startAutoPlay();
  };

  if (loading || testimonials.length === 0) return null;

  const t = testimonials[current];

  return (
    <section className="py-20 md:py-28 bg-[#F9FAFB] overflow-hidden">
      <div className="container mx-auto px-4">
        <FadeUp className="text-center mb-14">
          <p className="section-label mb-2">What Our Clients Say</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Trusted by Thousands
          </h2>
          <p className="text-muted-foreground mt-2 text-sm" dir="rtl">ہمارے خوش مسافر</p>
        </FadeUp>

        <div className="max-w-3xl mx-auto relative">
          {/* Card */}
          <div className="relative overflow-hidden min-h-[260px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 60 }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="testimonial-card"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-gold fill-gold" />
                  ))}
                  <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-gold/70 border border-gold/20 rounded-full px-2 py-0.5 bg-gold/5">
                    {t.tag}
                  </span>
                </div>

                {/* Quote text */}
                <p className="text-foreground/80 leading-relaxed text-base md:text-lg mb-8 font-medium pr-2" dir="auto">
                  {t.text}
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-6 border-t border-border/60">
                  <div className="w-11 h-11 rounded-2xl bg-hero-gradient flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground text-base">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{t.location}</p>
                  </div>
                  <Quote className="w-8 h-8 text-gold/15 ml-auto" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setDirection(i > current ? 1 : -1); setCurrent(i); startAutoPlay(); }}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2.5 bg-gold" : "w-2.5 h-2.5 bg-border hover:bg-gold/40"}`}
                />
              ))}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
