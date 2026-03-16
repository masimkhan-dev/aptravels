import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENCY, FACEBOOK_URL, WHATSAPP_URL } from "@/lib/constants";
import { Save, Loader2, Info, Phone, Globe, Facebook, MessageCircle, MapPin, Mail, User, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface SiteSetting {
    key: string;
    value: any;
}

const DEFAULT_ABOUT = {
    title: "Serving Pilgrims Since 2019",
    urduTitle: "دیانتداری کے ساتھ خدمت — ۲۰۱۹ سے",
    subTitle: "Akbar Pura International Travels & Tours",
    description: "Akbar Pura International Travels & Tours has been serving people of Nowshera and nearby areas since 2019...\n\nOur office is at Madina Market, Akbar Pura. You can walk in and talk to us directly. Shahab Khan and our team take care of your paperwork, bookings, and arrangements — so you can focus on your journey.\n\nFor tickets, we work with Emirates, Qatar Airways, Saudia, Pakistan International Airlines, and Oman Air. We find the right option based on your dates and budget.",
    stats: [
        { label: "Years of Experience", value: "10+" },
        { label: "Happy Pilgrims", value: "Satisfied" },
        { label: "Trusted Travel Office", value: "Nowshera" },
    ],
    features: [
        "Clear and honest pricing",
        "Personal support at every step",
        "Complete documentation assistance",
        "Friendly and experienced staff",
    ],
};

const DEFAULT_CONTACT = {
    agencyName: AGENCY.name,
    tagline: AGENCY.tagline,
    contactPerson: AGENCY.contact,
    phones: AGENCY.phones,
    whatsapp: AGENCY.whatsapp,
    email: AGENCY.email,
    address: AGENCY.address,
    facebook: FACEBOOK_URL,
};

export default function AdminSettings() {
    const queryClient = useQueryClient();
    const [savingAbout, setSavingAbout] = useState(false);
    const [savingContact, setSavingContact] = useState(false);

    // Settings State
    const [about, setAbout] = useState(DEFAULT_ABOUT);
    const [contact, setContact] = useState(DEFAULT_CONTACT);

    // Using React Query for fetching
    const { data: settings, isLoading } = useQuery({
        queryKey: ["site_settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("site_settings" as any)
                .select("*");
            if (error) throw error;
            return data as SiteSetting[];
        }
    });

    // Update local state when database data is loaded
    useEffect(() => {
        if (settings) {
            const aboutRow = settings.find(r => r.key === "about_section");
            const contactRow = settings.find(r => r.key === "contact_info");
            if (aboutRow) setAbout(aboutRow.value);
            if (contactRow) setContact(contactRow.value);
        }
    }, [settings]);

    const handleSaveAbout = async () => {
        setSavingAbout(true);
        try {
            const { error } = await supabase
                .from("site_settings" as any)
                .upsert({
                    key: "about_section",
                    value: about,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["site_settings"] });
            toast.success("About section updated successfully!");
        } catch (err) {
            console.error("Error saving about settings:", err);
            toast.error("Failed to save changes.");
        } finally {
            setSavingAbout(false);
        }
    };

    const handleSaveContact = async () => {
        // Validation check
        if (!contact.whatsapp.startsWith("92")) {
            toast.error("WhatsApp must start with country code (92)");
            return;
        }

        setSavingContact(true);
        try {
            const { error } = await supabase
                .from("site_settings" as any)
                .upsert({
                    key: "contact_info",
                    value: contact,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["site_settings"] });
            toast.success("Contact info updated successfully!");
        } catch (err) {
            console.error("Error saving contact settings:", err);
            toast.error("Failed to save changes.");
        } finally {
            setSavingContact(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="font-display text-4xl font-black tracking-tight flex items-center gap-3">
                    Site <span className="text-gold">Settings</span>
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Manage the public content and contact information of your website.</p>
            </div>

            <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="about" className="rounded-lg">About Section</TabsTrigger>
                    <TabsTrigger value="contact" className="rounded-lg">Contact & Socials</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-4 pt-6 animate-in fade-in slide-in-from-bottom-2">
                    <Card className="border-border/50 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black italic">Who We Are Content</CardTitle>
                                    <CardDescription>Edit the main text and statistics shown on the home page.</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAbout(DEFAULT_ABOUT)}
                                    className="rounded-xl border-dashed hover:border-gold hover:text-gold gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" /> Reset
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8 p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" /> English Heading
                                    </label>
                                    <Input
                                        value={about.title}
                                        onChange={(e) => setAbout({ ...about, title: e.target.value })}
                                        className="h-12 text-lg font-bold border-gold/10 focus:border-gold/30 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <MessageCircle className="w-3.5 h-3.5 text-gold" /> Urdu Tagline
                                    </label>
                                    <Input
                                        value={about.urduTitle}
                                        dir="rtl"
                                        onChange={(e) => setAbout({ ...about, urduTitle: e.target.value })}
                                        className="h-12 text-lg font-bold border-gold/10 focus:border-gold/30 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5" /> Subtitle / Company Name (Bold)
                                </label>
                                <Input
                                    value={about.subTitle}
                                    onChange={(e) => setAbout({ ...about, subTitle: e.target.value })}
                                    className="h-12 text-base font-black border-gold/10 focus:border-gold/30 rounded-xl"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" /> Full Description (Paragraphs)
                                </label>
                                <Textarea
                                    value={about.description}
                                    onChange={(e) => setAbout({ ...about, description: e.target.value })}
                                    rows={10}
                                    className="text-base leading-relaxed border-gold/10 focus:border-gold/30 rounded-xl"
                                />
                                <p className="text-[10px] text-muted-foreground italic">Tip: Use empty lines to create new paragraphs.</p>
                            </div>

                            <div className="pt-4 space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                                    <span>Key Performance Metrics</span>
                                    <div className="h-px flex-1 bg-border" />
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {about.stats.map((stat, idx) => (
                                        <div key={idx} className="space-y-3 p-5 border border-border/40 rounded-2xl bg-muted/20 hover:border-gold/20 transition-all group">
                                            <Input
                                                value={stat.label}
                                                onChange={(e) => {
                                                    const next = [...about.stats];
                                                    next[idx].label = e.target.value;
                                                    setAbout({ ...about, stats: next });
                                                }}
                                                className="h-8 text-[11px] font-black uppercase tracking-widest bg-transparent border-none p-0 focus-visible:ring-0"
                                            />
                                            <Input
                                                value={stat.value}
                                                onChange={(e) => {
                                                    const next = [...about.stats];
                                                    next[idx].value = e.target.value;
                                                    setAbout({ ...about, stats: next });
                                                }}
                                                className="h-10 text-xl font-black text-gold bg-transparent border-none p-0 focus-visible:ring-0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8 flex justify-end">
                                <Button
                                    onClick={handleSaveAbout}
                                    disabled={savingAbout}
                                    className="h-12 px-8 rounded-xl bg-gold text-white hover:bg-gold/90 gap-3 font-black uppercase tracking-widest shadow-lg shadow-gold/20"
                                >
                                    {savingAbout ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Sync About Section
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 pt-6 animate-in fade-in slide-in-from-bottom-2">
                    <Card className="border-border/50 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black italic">Agency Branding & Connect</CardTitle>
                                    <CardDescription>Maintain your official contact matrix and social identity.</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setContact(DEFAULT_CONTACT)}
                                    className="rounded-xl border-dashed hover:border-gold hover:text-gold gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" /> Reset
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8 p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Agency Name
                                    </label>
                                    <Input
                                        value={contact.agencyName}
                                        onChange={(e) => setContact({ ...contact, agencyName: e.target.value })}
                                        className="h-12 border-border/40 rounded-xl px-4"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" /> Lead Contact Person
                                    </label>
                                    <Input
                                        value={contact.contactPerson}
                                        onChange={(e) => setContact({ ...contact, contactPerson: e.target.value })}
                                        className="h-12 border-border/40 rounded-xl px-4"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-2 italic">
                                    Official Tagline
                                </label>
                                <Input
                                    value={contact.tagline}
                                    onChange={(e) => setContact({ ...contact, tagline: e.target.value })}
                                    className="h-12 border-gold/10 focus:border-gold/30 rounded-xl px-4 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-blue-500" /> Professional Email
                                    </label>
                                    <Input
                                        value={contact.email}
                                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                                        className="h-12 border-border/40 rounded-xl px-4"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Business (92...)
                                    </label>
                                    <Input
                                        value={contact.whatsapp}
                                        onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                                        className="h-12 border-emerald-500/10 focus:border-emerald-500/30 rounded-xl px-4 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-dashed">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Office Phone Matrix</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {contact.phones.map((phone, idx) => (
                                        <div key={idx} className="relative group">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-gold transition-colors" />
                                            <Input
                                                value={phone}
                                                onChange={(e) => {
                                                    const next = [...contact.phones];
                                                    next[idx] = e.target.value;
                                                    setContact({ ...contact, phones: next });
                                                }}
                                                className="h-11 pl-10 border-border/40 rounded-xl"
                                                placeholder={`Phone ${idx + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Physical Headquarters Address
                                </label>
                                <Textarea
                                    value={contact.address}
                                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                                    rows={3}
                                    className="border-border/40 rounded-xl px-4 resize-none leading-relaxed"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-[#1877F2] flex items-center gap-2">
                                    <Facebook className="w-3.5 h-3.5" /> Official Facebook Presence
                                </label>
                                <Input
                                    value={contact.facebook}
                                    onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
                                    className="h-12 border-[#1877F2]/10 focus:border-[#1877F2]/30 rounded-xl px-4"
                                />
                            </div>

                            <div className="pt-8 flex justify-end">
                                <Button
                                    onClick={handleSaveContact}
                                    disabled={savingContact}
                                    className="h-12 px-8 rounded-xl bg-gold text-white hover:bg-gold/90 gap-3 font-black uppercase tracking-widest shadow-lg shadow-gold/20"
                                >
                                    {savingContact ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Deploy Contact Info
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
