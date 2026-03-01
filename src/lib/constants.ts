export const AGENCY = {
  name: "Akbar Pura International Travels & Tours",
  tagline: "Your Journey, Our Responsibility",
  contact: "Shahab Khan",
  phones: ["03163050602", "03489489689", "03009040892"],
  whatsapp: "923163050602",
  email: "akbarpuraintertravels@gmail.com",
  address: "Madina Market, Kandar Road, Akbar Pura, Nowshera, KPK, Pakistan",
  airlines: ["Gulf Air", "Emirates", "Oman Air", "Saudia", "Qatar Airways", "PIA"],
} as const;

export const WHATSAPP_URL = `https://wa.me/${AGENCY.whatsapp}`;
export const PHONE_URL = `tel:${AGENCY.phones[0]}`;
export const FACEBOOK_URL = "https://www.facebook.com/akbarpurainternationaltravels";
