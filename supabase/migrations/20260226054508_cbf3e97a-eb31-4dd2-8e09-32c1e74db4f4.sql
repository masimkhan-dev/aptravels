
-- The "Anyone can submit inquiries" policy with WITH CHECK (true) is intentional
-- as this is a public contact form. Adding rate limiting via a more specific check
-- isn't needed at DB level. No changes needed - this is acceptable for a public inquiry form.

-- Add indexes for performance
CREATE INDEX idx_packages_is_active ON public.packages(is_active);
CREATE INDEX idx_packages_is_popular ON public.packages(is_popular);
CREATE INDEX idx_services_is_active ON public.services(is_active);
CREATE INDEX idx_services_sort_order ON public.services(sort_order);
CREATE INDEX idx_inquiries_is_read ON public.inquiries(is_read);
CREATE INDEX idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
