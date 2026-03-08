import { motion } from "framer-motion";
import { Plane, Globe, DollarSign, Clock, ShieldCheck, Zap, Headphones, CheckCircle2, ChevronRight } from "lucide-react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import FloatingButtons from "@/components/public/FloatingButtons";
import InquiryForm from "@/components/public/InquiryForm";
import { AGENCY, PHONE_URL, WHATSAPP_URL } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const FlightBooking = () => {
    const { data: contactData } = useSiteSettings("contact_info");

    const agencyName = contactData?.agencyName || AGENCY.name;
    const phone = contactData?.phones?.[0] || AGENCY.phones[0];
    const whatsappNumber = contactData?.whatsapp || AGENCY.whatsapp;

    const phoneUrl = `tel:${phone}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;

    const features = [
        {
            icon: <DollarSign className="w-6 h-6 text-gold" />,
            title: "Competitive Pricing",
            description: "We offer some of the best prices in the market, ensuring you get maximum value without compromising on comfort and convenience."
        },
        {
            icon: <Globe className="w-6 h-6 text-gold" />,
            title: "Extensive Destinations",
            description: "From bustling cities to tranquil retreats, discover flights to thousands of destinations worldwide. No matter where you want to go, we have a route to take you there."
        },
        {
            icon: <Zap className="w-6 h-6 text-gold" />,
            title: "Easy Booking Process",
            description: "With our user-friendly interface, booking your flight is a breeze. Our intuitive filters help you find the best deal that fits your schedule and budget."
        },
        {
            icon: <Clock className="w-6 h-6 text-gold" />,
            title: "Exclusive Discounts",
            description: "Get access to special offers, early-bird discounts, and last-minute deals that help you save more on your travel plans."
        },
        {
            icon: <Plane className="w-6 h-6 text-gold" />,
            title: "Wide Range of Options",
            description: "Choose from a variety of airlines, seating classes, and routes to suit your travel preferences, from low-cost to first-class."
        },
        {
            icon: <Headphones className="w-6 h-6 text-gold" />,
            title: "Customer-Centric Support",
            description: "Our knowledgeable representatives are available via phone, email, and live chat to ensure your journey is smooth and enjoyable."
        }
    ];

    const steps = [
        {
            title: "Contact Our Specialist",
            description: "Send us your travel dates and destination via WhatsApp or call us directly."
        },
        {
            title: "Get Best Quotation",
            description: "Our experts will search all airlines to find the most affordable and comfortable flights for you."
        },
        {
            title: "Confirm Your Flight",
            description: "Review your options, share your passport details, and confirm your preferred flight."
        },
        {
            title: "Receive E-Ticket",
            description: "Once confirmed, receive your electronic ticket instantly on your phone or email."
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden">
                {/* Background Patterns */}
                <div className="absolute inset-0 bg-secondary" />
                <div className="absolute inset-0 bg-hero-gradient opacity-60" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109c0f?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

                <div className="container px-4 mx-auto relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 group cursor-default">
                                <Plane className="w-4 h-4 text-gold animate-float" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">International Flight Booking</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-8 leading-[1.1] tracking-tight">
                                Book Flights with <span className="text-gradient-gold">Confidence</span> –
                                <span className="block mt-2">Discover Best Deals</span>
                            </h1>
                            <p className="text-lg md:text-xl text-white/70 mb-12 leading-loose max-w-2xl mx-auto font-medium">
                                Planning your next trip? At {agencyName}, we provide a personalized booking experience to help you find the best flights at unbeatable prices.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <a href="#booking-steps" className="btn-gold px-10 py-5 rounded-2xl flex items-center gap-3 text-base shadow-2xl hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                                    Learn How to Book <ChevronRight className="w-5 h-5" />
                                </a>
                                <a href={`${whatsappUrl}?text=${encodeURIComponent("Assalam-o-Alaikum Akbar Pura Travels! Mujhe International Flight ki details chahiye.")}`} target="_blank" rel="noopener noreferrer" className="btn-ghost-light px-10 py-5 rounded-2xl flex items-center gap-3 text-base backdrop-blur-md border-white/30 hover:bg-white/10 w-full sm:w-auto">
                                    <Headphones className="w-5 h-5" /> Contact Specialist
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 md:py-32 bg-[#F8FAFC]">
                <div className="container px-4 mx-auto">
                    <div className="max-w-3xl mx-auto text-center mb-20">
                        <p className="section-label mb-3">Why Choose Us</p>
                        <h2 className="text-4xl md:text-5xl font-display font-black mb-6">Why Book Flights with Us?</h2>
                        <div className="w-24 h-1.5 bg-gradient-gold mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                                className="bg-card flex flex-col h-full p-10 rounded-3xl border border-gold/10 hover-lift shadow-card hover:shadow-card-hover group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gold/5 flex items-center justify-center mb-8 border border-gold/20 group-hover:bg-gold-gradient group-hover:scale-110 group-hover:shadow-gold transition-all duration-500">
                                    <div className="group-hover:text-secondary group-hover:scale-110 transition-all duration-500">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="text-2xl font-display font-bold mb-4 text-foreground leading-tight group-hover:text-gold transition-colors">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Booking Steps Section */}
            <section id="booking-steps" className="py-24 md:py-32 overflow-hidden bg-background">
                <div className="container px-4 mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="lg:w-1/2">
                            <p className="section-label mb-4">The Process</p>
                            <h2 className="text-4xl md:text-6xl font-display font-black mb-8 leading-[1.1] tracking-tight">
                                How to Book <br />
                                <span className="text-gradient-gold">Your Next Flight?</span>
                            </h2>
                            <p className="text-lg text-muted-foreground mb-12 leading-loose">
                                Booking your flight with Akbar Pura Travels is designed to be effortless. We handle the complexity while you enjoy the journey.
                            </p>

                            <div className="space-y-12 relative">
                                {/* Vertical line for timeline look on desktop */}
                                <div className="hidden sm:block absolute left-6 top-4 bottom-4 w-px bg-gold/20" />

                                {steps.map((step, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.15 }}
                                        className="flex gap-8 group relative z-10"
                                    >
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center font-black text-gold border-2 border-gold/30 group-hover:border-gold group-hover:bg-gold-gradient group-hover:text-secondary transition-all duration-500 scale-110 sm:scale-100">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-display font-bold text-xl mb-2 text-foreground">{step.title}</h4>
                                            <p className="text-base text-muted-foreground leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:w-1/2 relative mt-12 lg:mt-0">
                            <div className="absolute -inset-10 bg-gold-gradient opacity-10 blur-[80px] rounded-full" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="relative bg-card rounded-[2.5rem] border border-gold/20 p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] gold-border"
                            >
                                <div className="flex items-center gap-5 mb-10 pb-10 border-b border-border">
                                    <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 border border-green-500/20">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="font-display font-bold text-2xl text-foreground tracking-tight">Verified & Secure</h3>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Authorized Travel Partner</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-muted/30 border border-gold/10 space-y-4">
                                        <div className="h-3.5 w-full bg-border/40 rounded-full animate-pulse" />
                                        <div className="h-3.5 w-[85%] bg-border/40 rounded-full animate-pulse" />
                                        <div className="h-3.5 w-[70%] bg-border/40 rounded-full animate-pulse" />
                                    </div>
                                    <div className="p-6 rounded-2xl bg-gold-gradient text-secondary font-black text-center shadow-gold hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-lg tracking-tight uppercase">
                                        <a href={`${whatsappUrl}?text=${encodeURIComponent("Assalam-o-Alaikum Akbar Pura Travels! Mujhe flight booking ke liye help chahiye.")}`} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            Book on WhatsApp
                                        </a>
                                    </div>
                                    <p className="text-[11px] font-medium text-center text-muted-foreground/60 leading-relaxed italic">
                                        * Prices are subject to airline availability at the time of confirmation.
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 md:py-32">
                <div className="container px-4 mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="bg-hero-gradient rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-[0_45px_100px_-20px_rgba(15,23,42,0.4)]"
                    >
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 p-12 opacity-[0.05] -translate-y-1/4 translate-x-1/4 pointer-events-none">
                            <Plane className="w-[400px] h-[400px] -rotate-[15deg]" />
                        </div>
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold blur-[140px] opacity-20" />

                        <div className="relative z-10 max-w-3xl mx-auto">
                            <p className="text-gold font-bold uppercase tracking-[0.3em] text-xs mb-6">Adventure Awaits</p>
                            <h2 className="text-4xl md:text-7xl font-display font-black mb-10 leading-[1.1] tracking-tight">Ready to Take Off?</h2>
                            <p className="text-xl text-white/70 mb-14 leading-relaxed max-w-xl mx-auto font-medium">
                                Don't miss out on our exclusive deals. Contact our specialists today for a personalized quote.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <a href={phoneUrl} className="btn-gold px-12 py-5 rounded-2xl text-lg w-full sm:w-auto shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                    Call Now: {phone}
                                </a>
                                <a href="#contact" className="btn-ghost-light px-12 py-5 rounded-2xl text-lg w-full sm:w-auto backdrop-blur-md border-white/40 hover:bg-white/10 active:scale-95 transition-all">
                                    Send Inquiry
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <InquiryForm />
            <Footer />
            <FloatingButtons />
        </div>
    );
};

export default FlightBooking;
