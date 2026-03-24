-- Restore Standard Services
INSERT INTO public.services (title, description, icon, is_active, sort_order) VALUES 
('Hajj & Umrah Packages', 'Comprehensive pilgrims support with flights, luxury hotels near Haram, and reliable transport.', 'plane', true, 1),
('Visa Assistance', 'Fast processing for Saudi Arabia, Dubai, Qatar, and other international destinations.', 'file-check', true, 2),
('Global Flight Booking', 'Competitive rates for Gulf Air, Emirates, Saudia, and all international airlines.', 'plane', true, 3),
('Hotel Reservations', 'Partnerships with 4-star and 5-star hotels globally for your comfort stay.', 'hotel', true, 4),
('Luxury Transport', 'Private and group transport services across Saudi Arabia and local tourism.', 'map-pin', true, 5),
('Tour Packages', 'Curated family and honeymoon tours to Turkey, Baku, and more.', 'award', true, 6);

-- Restore Standard Packages
INSERT INTO public.packages (title, destination, description, price, duration, is_popular, is_active, inclusions) VALUES 
('15 Days Economy Umrah', 'Saudi Arabia', 'Affordable spiritual journey with shared accommodation and direct Saudi Air flights.', 215000, '15 Days', true, true, '{"Visa", "Hotel", "Transport", "Flight"}'),
('21 Days Premium Umrah', 'Saudi Arabia', 'Luxury stay in 5-star hotels near Haram (Mecca & Medina) with individual transport.', 320000, '21 Days', false, true, '{"VIP Visa", "5-Star Hotel", "Private Car", "Mealtimes"}'),
('Dubai Family Tour', 'United Arab Emirates', 'A 5-day adventure exploring Burj Khalifa, Desert Safari, and Dubai Mall.', 185000, '5 Days', true, true, '{"Visa", "Hotel", "City Tour", "Desert Safari"}');
