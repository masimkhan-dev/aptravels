import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle, MapPin, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AGENCY } from "@/lib/constants";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  package_interest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type FormData = z.infer<typeof formSchema>;

export default function InquiryForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      package_interest: "",
      message: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const { error: dbError } = await supabase.from("inquiries").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      package_interest: data.package_interest || null,
    });

    setLoading(false);

    if (dbError) {
      toast.error("Something went wrong. Please try again.");
    } else {
      setSuccess(true);
      toast.success("Inquiry sent successfully!");
      reset();
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-2">
            Get In Touch
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
            Contact Us
          </h2>
          <p className="text-muted-foreground mt-1" dir="rtl">ہم سے رابطہ کریں</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                {AGENCY.name}
              </h3>
              <p className="text-muted-foreground">{AGENCY.tagline}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">{AGENCY.address}</p>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  {AGENCY.phones.map((p) => (
                    <a key={p} href={`tel:${p}`} className="block text-foreground hover:text-gold transition-colors">
                      {p}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                <a href={`mailto:${AGENCY.email}`} className="text-sm text-foreground hover:text-gold transition-colors">
                  {AGENCY.email}
                </a>
              </div>
            </div>

            {/* Google Maps */}
            <div className="rounded-xl overflow-hidden border border-border shadow-card">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13339.30!2d71.96703!3d34.01536!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38d902a36bcd11e5%3A0xbd58e6a028040a62!2sNowshera%2C+Khyber+Pakhtunkhwa!5e0!3m2!1sen!2spk!4v1677485234567!5m2!1sen!2spk"
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: "12px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Akbar Pura Int'l Travels Office Location"
              />
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <input
                {...register("name")}
                placeholder="Full Name *"
                className={`w-full px-4 py-3 rounded-lg border bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all text-sm ${errors.name ? "border-destructive" : "border-border"
                  }`}
              />
              {errors.name && <p className="text-destructive text-xs ml-1">{errors.name.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Email *"
                  className={`w-full px-4 py-3 rounded-lg border bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all text-sm ${errors.email ? "border-destructive" : "border-border"
                    }`}
                />
                {errors.email && <p className="text-destructive text-xs ml-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="Phone *"
                  className={`w-full px-4 py-3 rounded-lg border bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all text-sm ${errors.phone ? "border-destructive" : "border-border"
                    }`}
                />
                {errors.phone && <p className="text-destructive text-xs ml-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <input
                {...register("package_interest")}
                placeholder="Package Interest (optional)"
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <textarea
                {...register("message")}
                placeholder="Your Message *"
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all text-sm resize-none ${errors.message ? "border-destructive" : "border-border"
                  }`}
              />
              {errors.message && <p className="text-destructive text-xs ml-1">{errors.message.message}</p>}
            </div>

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" /> Your inquiry has been submitted successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-lg bg-gold-gradient text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending..." : "Send Inquiry"}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
