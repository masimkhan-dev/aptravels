import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AGENCY, FACEBOOK_URL, WHATSAPP_URL } from "@/lib/constants";
import { Save, Loader2, Info, Phone, Globe, Facebook, MessageCircle, MapPin, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const DEFAULT_ABOUT = {
    title: "Serving Pilgrims Since 2019",
    description: "Akbar Pura International Travels & Tours has been serving people of Nowshera and nearby areas since 2019...",
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [about, setAbout] = useState(DEFAULT_ABOUT);
    const [contact, setContact] = useState(DEFAULT_CONTACT);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("site_settings" as any)
                    .select("*");

                if (error) throw error;

                if (data) {
                    const aboutRow = data.find((r: any) => r.key === "about_section");
                    const contactRow = data.find((r: any) => r.key === "contact_info");

                    if (aboutRow) setAbout(aboutRow.value);
                    if (contactRow) setContact(contactRow.value);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
                toast.error("Failed to load settings from database. Using defaults.");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSaveAbout = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("site_settings" as any)
                .upsert({ key: "about_section", value: about, updated_at: new Date().toISOString() });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["site_settings", "about_section"] });
            toast.success("About section updated successfully!");
        } catch (err) {
            console.error("Error saving about settings:", err);
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveContact = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("site_settings" as any)
                .upsert({ key: "contact_info", value: contact, updated_at: new Date().toISOString() });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["site_settings", "contact_info"] });
            toast.success("Contact info updated successfully!");
        } catch (err) {
            console.error("Error saving contact settings:", err);
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="font-display text-3xl font-bold tracking-tight">Site Settings</h1>
                <p className="text-muted-foreground text-sm">Manage the public content and contact information of your website.</p>
            </div>

            <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="about">About Section</TabsTrigger>
                    <TabsTrigger value="contact">Contact & Socials</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About Section Content</CardTitle>
                            <CardDescription>Edit the main text and statistics shown in the "Who We Are" section.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Main Title</label>
                                <Input
                                    value={about.title}
                                    onChange={(e) => setAbout({ ...about, title: e.target.value })}
                                    placeholder="e.g. Serving Pilgrims Since 2019"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    value={about.description}
                                    onChange={(e) => setAbout({ ...about, description: e.target.value })}
                                    placeholder="Enter about section description..."
                                    rows={5}
                                />
                            </div>

                            <div className="pt-4 space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2"><Info className="w-4 h-4 text-gold" /> Statistics</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {about.stats.map((stat, idx) => (
                                        <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                                            <Input
                                                value={stat.label}
                                                onChange={(e) => {
                                                    const next = [...about.stats];
                                                    next[idx].label = e.target.value;
                                                    setAbout({ ...about, stats: next });
                                                }}
                                                placeholder="Label"
                                                className="text-xs"
                                            />
                                            <Input
                                                value={stat.value}
                                                onChange={(e) => {
                                                    const next = [...about.stats];
                                                    next[idx].value = e.target.value;
                                                    setAbout({ ...about, stats: next });
                                                }}
                                                placeholder="Value"
                                                className="font-bold border-gold/20"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-gold" /> Key Features</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {about.features.map((feature, idx) => (
                                        <Input
                                            key={idx}
                                            value={feature}
                                            onChange={(e) => {
                                                const next = [...about.features];
                                                next[idx] = e.target.value;
                                                setAbout({ ...about, features: next });
                                            }}
                                            placeholder={`Feature ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <Button onClick={handleSaveAbout} disabled={saving} className="bg-gold-gradient text-secondary hover:opacity-90 gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save About Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Agency & Contact Details</CardTitle>
                            <CardDescription>Keep your contact details and social media links up to date.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Agency Name</label>
                                    <Input value={contact.agencyName} onChange={(e) => setContact({ ...contact, agencyName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2"><User className="w-3.5 h-3.5" /> Contact Person</label>
                                    <Input value={contact.contactPerson} onChange={(e) => setContact({ ...contact, contactPerson: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2 text-gold">Tagline (Shows in Footer)</label>
                                <Input value={contact.tagline} onChange={(e) => setContact({ ...contact, tagline: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email Address</label>
                                    <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> WhatsApp (Format: 92...)</label>
                                    <Input value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-dashed">
                                <h4 className="text-sm font-bold flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /> Phone Numbers</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {contact.phones.map((phone, idx) => (
                                        <Input
                                            key={idx}
                                            value={phone}
                                            onChange={(e) => {
                                                const next = [...contact.phones];
                                                next[idx] = e.target.value;
                                                setContact({ ...contact, phones: next });
                                            }}
                                            placeholder={`Phone ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Office Address</label>
                                <Textarea value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} rows={2} />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium flex items-center gap-2 text-[#1877F2]"><Facebook className="w-3.5 h-3.5" /> Facebook Page URL</label>
                                <Input value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} />
                            </div>

                            <div className="pt-6 flex justify-end">
                                <Button onClick={handleSaveContact} disabled={saving} className="bg-gold-gradient text-secondary hover:opacity-90 gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Contact Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
