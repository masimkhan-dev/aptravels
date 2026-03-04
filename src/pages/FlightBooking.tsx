import { motion } from "framer-motion";
import { Plane, Globe, DollarSign, Clock, ShieldCheck, Zap, Headphones, CheckCircle2, ChevronRight } from "lucide-react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import FloatingButtons from "@/components/public/FloatingButtons";
import InquiryForm from "@/components/public/InquiryForm";
import { AGENCY, PHONE_URL, WHATSAPP_URL } from "@/lib/constants";

const FlightBooking = () => {
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
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
                <div className="container px-4 mx-auto relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 mb-6 group cursor-default">
                                <Plane className="w-4 h-4 text-gold" />
                                <span className="section-label">International Flight Booking</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
                                Book Flights with Ease – <br />
                                <span className="text-gradient-gold">Discover Best Deals Worldwide</span>
                            </h1>
                            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
                                Planning your next trip? At Akbar Pura Travels, we provide a personalized booking experience to help you find the best flights at unbeatable prices. No complex systems—just direct, expert service.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="#booking-steps" className="btn-gold px-8 py-4 rounded-xl flex items-center gap-2">
                                    Learn How to Book <ChevronRight className="w-4 h-4" />
                                </a>
                                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-xl border border-border font-bold hover:bg-muted transition-all">
                                    Contact Specialist
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-muted/30">
                <div className="container px-4 mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Why Book Flights with Us?</h2>
                        <div className="w-20 h-1 bg-gradient-gold mx-auto" />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-card p-8 rounded-2xl border border-border hover-lift shadow-sm group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold transition-colors duration-500">
                                    <div className="group-hover:text-white transition-colors duration-500">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Booking Steps Section */}
            <section id="booking-steps" className="py-24 overflow-hidden">
                <div className="container px-4 mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 leading-tight">
                                How to Book <br />
                                <span className="text-gradient-gold">Your Next Flight?</span>
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                Booking your flight with Akbar Pura Travels is a breeze! Follow these simple steps to secure your next adventure.
                            </p>

                            <div className="space-y-8">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center font-bold text-gold border border-gold/20 group-hover:bg-gold group-hover:text-white transition-all duration-300">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg mb-1">{step.title}</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:w-1/2 relative">
                            <div className="absolute -inset-4 bg-gradient-gold opacity-10 blur-3xl rounded-full" />
                            <div className="relative bg-card rounded-3xl border border-border p-8 shadow-2xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Verified & Secure</h3>
                                        <p className="text-xs text-muted-foreground">Certified IATA Partner Agency</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                                        <div className="h-4 w-3/4 bg-border/50 rounded animate-pulse" />
                                        <div className="h-4 w-1/2 bg-border/50 rounded animate-pulse" />
                                    </div>
                                    <div className="p-6 rounded-2xl bg-gold-gradient text-secondary font-bold text-center shadow-gold hover:opacity-95 transition-opacity cursor-pointer">
                                        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            Contact on WhatsApp to Book
                                        </a>
                                    </div>
                                    <p className="text-[10px] text-center text-muted-foreground">
                                        * Terms and conditions apply. Prices are subject to availability.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container px-4 mx-auto">
                    <div className="bg-hero-gradient rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Plane className="w-64 h-64 -rotate-12" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 relative z-10">Ready to Take Off?</h2>
                        <p className="text-white/80 mb-10 max-w-2xl mx-auto relative z-10">
                            Don't miss out on our exclusive early-bird offers. Contact our travel specialists today for a personalized quote.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                            <a href={PHONE_URL} className="btn-gold px-10 py-4 rounded-xl text-lg">
                                Call Now: {AGENCY.phones[0]}
                            </a>
                            <a href="#contact" className="btn-ghost-light px-10 py-4 rounded-xl text-lg backdrop-blur-sm">
                                Send Inquiry
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <InquiryForm />
            <Footer />
            <FloatingButtons />
        </div>
    );
};

export default FlightBooking;
