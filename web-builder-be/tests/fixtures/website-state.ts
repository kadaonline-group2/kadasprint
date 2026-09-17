import type { RevisionMutation } from "../../src/types/revision-mutation";
import type { WebsiteState } from "../../src/types/website-state";

export const validState: WebsiteState = {
  templateId: "template-fnb",
  theme: { primaryColor: "#6B3E26", accentColor: "#F4C27A", fontFamily: "sans" },
  meta: { businessName: "Warung Kopi", category: "F&B", tagline: "Teman ngopi" },
  hero: {
    title: "Kopi untuk Harimu",
    subtitle: "Kopi dan roti bakar di Surabaya",
    ctaText: "Pesan Sekarang",
    ctaWhatsappMessage: "Halo, saya ingin memesan",
  },
  about: { story: "Warung kopi untuk teman bekerja dan bersantai." },
  services: [
    { name: "Kopi Tubruk", description: "Kopi klasik", priceEstimate: "Rp12.000" },
    { name: "Roti Bakar", description: "Roti hangat", priceEstimate: "Rp15.000" },
    { name: "Es Kopi Susu", description: "Kopi susu dingin", priceEstimate: "Rp18.000" },
  ],
  testimonials: [
    { customerName: "Rina", review: "Kopinya enak." },
    { customerName: "Bagas", review: "Pelayanannya cepat." },
  ],
  contact: { whatsappNumber: "628123456789", address: "Surabaya" },
};

export const validMutation: RevisionMutation = {
  intent: "UPDATE_THEME",
  changedPaths: ["theme.primaryColor"],
  theme: { primaryColor: "#4A2C20" },
};
