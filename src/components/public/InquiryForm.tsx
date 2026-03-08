import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle, MapPin, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AGENCY } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";
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
  const { data: contactData } = useSiteSettings("contact_info");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const agencyName = contactData?.agencyName || AGENCY.name;
  const tagline = contactData?.tagline || AGENCY.tagline;
  const address = contactData?.address || AGENCY.address;
  const phones = contactData?.phones || AGENCY.phones;
  const email = contactData?.email || AGENCY.email;

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
          className="text-center mb-16"
        >
          <p className="section-label mb-2">
            Get In Touch
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Contact Us
          </h2>
          <p className="text-muted-foreground mt-2 italic text-sm md:text-base opacity-80" dir="rtl">ہم سے رابطہ کریں</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto items-start">
          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div className="border-l-4 border-gold pl-6">
              <h3 className="font-display text-3xl font-bold text-foreground mb-3">
                {agencyName}
              </h3>
              <p className="text-muted-foreground leading-relaxed italic">{tagline}</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gold/5 flex items-center justify-center border border-gold/10 group-hover:bg-gold-gradient transition-all duration-300">
                  <MapPin className="w-5 h-5 text-gold group-hover:text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Our Location</p>
                  <p className="text-foreground font-medium">{address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gold/5 flex items-center justify-center border border-gold/10 group-hover:bg-gold-gradient transition-all duration-300">
                  <Phone className="w-5 h-5 text-gold group-hover:text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Call Us Directly</p>
                  <div className="space-y-1">
                    {phones.map((p: string) => (
                      <a key={p} href={`tel:${p}`} className="block text-foreground font-medium hover:text-gold transition-colors">
                        {p}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gold/5 flex items-center justify-center border border-gold/10 group-hover:bg-gold-gradient transition-all duration-300">
                  <Mail className="w-5 h-5 text-gold group-hover:text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Email Support</p>
                  <a href={`mailto:${email}`} className="text-foreground font-medium hover:text-gold transition-colors">
                    {email}
                  </a>
                </div>
              </div>
            </div>

            {/* Google Maps */}
            <div className="rounded-3xl overflow-hidden border border-border/60 shadow-card gold-border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3309.2882141541814!2d71.9427306!3d34.0151121!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38d90fa6e1740683%3A0xe7a5c5310ba0878e!2sAkbar%20Pura%20Travels%20And%20Tours!5e0!3m2!1sen!2spk!4v1709772000000!5m2!1sen!2spk"
                width="100%"
                height="240"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Akbar Pura Int'l Travels Office Location"
              />
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card p-8 md:p-10 rounded-3xl border border-border shadow-card"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                <input
                  {...register("name")}
                  placeholder="Enter your name"
                  className={`w-full px-5 py-4 rounded-xl border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all text-sm ${errors.name ? "border-destructive" : "border-border"}`}
                />
                {errors.name && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 uppercase">{errors.name.message}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="name@example.com"
                    className={`w-full px-5 py-4 rounded-xl border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all text-sm ${errors.email ? "border-destructive" : "border-border"}`}
                  />
                  {errors.email && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 uppercase">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</label>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="03XX XXXXXXX"
                    className={`w-full px-5 py-4 rounded-xl border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all text-sm ${errors.phone ? "border-destructive" : "border-border"}`}
                  />
                  {errors.phone && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 uppercase">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Package Interest</label>
                <input
                  {...register("package_interest")}
                  placeholder="e.g., Umrah 15 Days, Dubai Visa"
                  className="w-full px-5 py-4 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Your Message</label>
                <textarea
                  {...register("message")}
                  placeholder="How can we help you?"
                  rows={4}
                  className={`w-full px-5 py-4 rounded-xl border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all text-sm resize-none ${errors.message ? "border-destructive" : "border-border"}`}
                />
                {errors.message && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 uppercase">{errors.message.message}</p>}
              </div>

              {success && (
                <div className="flex items-center gap-3 text-green-600 text-sm font-bold bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  <CheckCircle className="w-5 h-5" /> Your inquiry has been submitted! We'll contact you soon.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-5 rounded-2xl bg-gold-gradient text-secondary font-black shadow-gold hover:opacity-95 transform transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-wider border border-white/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? "Sending Message..." : "Send Inquiry"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
