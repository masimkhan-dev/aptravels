-- Migration: Create Testimonials Table for Enterprise-grade management
-- Description: Adds a system for dynamic testimonials with Admin Approval.

CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    tag TEXT, -- e.g., "International Flight", "Umrah Package"
    initials TEXT,
    is_published BOOLEAN DEFAULT false, -- Safety Switch: Only approved reviews go live
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone (public) can read only PUBLISHED testimonials
CREATE POLICY "Public: Read only published testimonials"
ON public.testimonials FOR SELECT
USING (is_published = true);

-- Policy 2: Admins (authenticated) have total control over all testimonials
CREATE POLICY "Admins: Full control over testimonials"
ON public.testimonials FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert Initial Seeding (Moving existing hardcoded data from the original code)
INSERT INTO public.testimonials (name, location, rating, text, tag, initials, is_published)
VALUES 
('Haji Muhammad Arif', 'Nowshera, KPK', 5, 'Akbar Pura Travels ne hamara Umrah ka safar bilkul aasan kar dia. Sab kuch pehle se arrange tha — tickets, hotel, aur visa. Bahut shukriya!', 'Umrah Package', 'HA', true),
('Shaheen Bibi', 'Peshawar, KPK', 5, 'Bahut honest aur professional team hai. Humne Dubai family tour book kiya tha — price bilkul sahi aur koi hidden charges nahi thay. Highly recommended!', 'Dubai Family Tour', 'SB', true),
('Tariq Mehmood', 'Mardan, KPK', 5, 'Gulf Air ka ticket book karaya tha — price bohot competitive thi aur e-ticket same day mili. Next time bhi inhi se karunga. Top service!', 'International Flight', 'TM', true),
('Nasreen Khatoon', 'Charsadda, KPK', 5, 'Hajj 2024 ke liye sab kuch Akbar Pura Travels ne handle kiya. Bahut care ke sath aur time pe sab kuch complete hua. Allah unhe jazak e khair de.', 'Hajj Services', 'NK', true),
('Imran Gul', 'Nowshera, KPK', 5, 'Mera Saudi visa application unhone handle kiya — 7 din mein visa aa gaya! Office mein baithe baithay sab ho gaya. Best travel agency in Nowshera.', 'Visa Processing', 'IG', true);
