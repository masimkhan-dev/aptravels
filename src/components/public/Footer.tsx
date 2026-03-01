import { Plane, Facebook } from "lucide-react";
import { AGENCY } from "@/lib/constants";
import { FACEBOOK_URL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center">
              <Plane className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">
                Akbar Pura Int'l Travels & Tours
              </p>
              <p className="text-xs text-secondary-foreground/60">{AGENCY.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-secondary-foreground/50">
              © {new Date().getFullYear()} {AGENCY.name}. All rights reserved.
            </p>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary-foreground/50 hover:text-gold transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
