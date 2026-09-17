export interface WebsiteState {
  templateId: "template-services" | "template-fnb" | "template-retail";
  theme: {
    primaryColor: string;
    accentColor: string;
    fontFamily: "sans" | "serif" | "display";
  };
  meta: {
    businessName: string;
    category: string;
    tagline: string;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaWhatsappMessage: string;
  };
  about: {
    story: string;
    highlights?: string[];
  };
  services: Array<{
    name: string;
    description: string;
    priceEstimate: string;
    iconKeyword?: string;
  }>;
  testimonials: Array<{
    customerName: string;
    review: string;
  }>;
  contact: {
    whatsappNumber: string | null;
    address: string;
    instagram?: string;
  };
}
