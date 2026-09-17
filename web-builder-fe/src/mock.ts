import type { WebsiteState } from "./types";
import { templatePalettes } from "./rendering/theme";

export const mockWebsite: WebsiteState = {
  templateId: "template-fnb",
  theme: {
    primaryColor: "#7B3F00",
    accentColor: "#F4A261",
    fontFamily: "display",
  },
  meta: {
    businessName: "Warung Kopi Sejahtera",
    category: "F&B",
    tagline: "Kopi Tubruk Autentik Surabaya",
  },
  hero: {
    title: "Ngopi Santai, Tetap Produktif",
    subtitle: "Kopi tubruk dan roti bakar favorit anak muda Surabaya.",
    ctaText: "Pesan via WhatsApp",
    ctaWhatsappMessage: "Halo, saya mau pesan kopi",
  },
  about: {
    story:
      "Warung Kopi Sejahtera hadir untuk menemani harimu dengan racikan kopi tubruk khas dan suasana nyaman buat nugas.",
    highlights: [
      "Kopi asli lokal",
      "Tempat nyaman buat nugas",
      "Harga bersahabat",
    ],
  },
  services: [
    {
      name: "Kopi Tubruk",
      description: "Kopi hitam khas dengan ampas alami.",
      priceEstimate: "Rp10.000",
      iconKeyword: "coffee",
    },
    {
      name: "Roti Bakar Coklat Keju",
      description: "Roti bakar dengan isian melimpah.",
      priceEstimate: "Rp15.000",
      iconKeyword: "bread",
    },
    {
      name: "Es Kopi Susu",
      description: "Kopi susu dingin dengan rasa manis pas.",
      priceEstimate: "Rp13.000",
      iconKeyword: "milk",
    },
  ],
  testimonials: [
    {
      customerName: "Rina",
      review: "Kopinya enak banget, tempatnya juga nyaman buat kerja.",
    },
    {
      customerName: "Budi",
      review: "Harga terjangkau, cocok buat nongkrong santai.",
    },
  ],
  contact: {
    whatsappNumber: "628123456789",
    address: "Jl. Merdeka No. 10, Surabaya",
    instagram: "@warungkopisejahtera",
  },
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

function detectTemplate(prompt: string): WebsiteState["templateId"] {
  const lower = prompt.toLowerCase();
  if (/jasa|konsultan|studio|servis|service/.test(lower)) {
    return "template-services";
  }
  if (/retail|toko|produk|fashion|barang|kemeja/.test(lower)) {
    return "template-retail";
  }
  return "template-fnb";
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function parseAddedService(prompt: string): WebsiteState["services"][number] | null {
  if (!/tambah/.test(prompt.toLowerCase())) return null;
  const afterColon = prompt.split(":").slice(1).join(":").trim();
  const priceMatch = afterColon.match(/harga\s+(.+)$/i);
  const name = (
    priceMatch
      ? afterColon.slice(0, priceMatch.index).trim()
      : afterColon || "Item baru"
  ).replace(/[.]+$/, "");
  let priceEstimate = "Rp15.000";
  if (priceMatch) {
    const raw = priceMatch[1].toLowerCase();
    const numeric = Number(raw.replace(/[^\d]/g, ""));
    if (Number.isFinite(numeric) && numeric > 0) {
      priceEstimate = /ribu|rb/.test(raw)
        ? formatRupiah(numeric * 1000)
        : formatRupiah(numeric);
    }
  }
  return {
    name: name || "Item baru",
    description: `${name || "Item baru"} ditambahkan dari permintaan kamu.`,
    priceEstimate,
  };
}

export async function mockGenerateWebsite(
  prompt: string,
  current?: WebsiteState,
): Promise<WebsiteState> {
  await wait(import.meta.env.MODE === "test" ? 0 : 650);
  const lower = prompt.toLowerCase();

  if (!current) {
    const templateId = detectTemplate(prompt);
    const palette = templatePalettes[templateId];
    const next = structuredClone(mockWebsite);
    next.templateId = templateId;
    next.theme = {
      ...next.theme,
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
    };
    const nameGuess = prompt.split(",")[0]?.trim();
    if (nameGuess) {
      next.meta = {
        ...next.meta,
        businessName: nameGuess,
      };
    }
    if (templateId === "template-services") {
      next.meta.category = "Jasa";
    } else if (templateId === "template-retail") {
      next.meta.category = "Retail";
    }
    next.hero = {
      ...next.hero,
      subtitle: prompt.slice(0, 180),
    };
    return next;
  }

  const next = structuredClone(current);
  if (lower.includes("navy")) {
    next.theme = {
      ...next.theme,
      primaryColor: "#12304A",
      accentColor: "#D4A373",
    };
    return next;
  }
  if (lower.includes("hijau") || lower.includes("green")) {
    next.theme = {
      ...next.theme,
      primaryColor: "#315C4A",
      accentColor: "#E8C07D",
    };
    return next;
  }
  if (
    lower.includes("cokelat") ||
    lower.includes("coklat") ||
    lower.includes("klasik")
  ) {
    next.theme = {
      ...next.theme,
      primaryColor: "#5C3317",
      accentColor: "#C4A574",
    };
    return next;
  }
  const added = parseAddedService(prompt);
  if (added) {
    next.services = [...next.services, added];
    return next;
  }
  next.hero = {
    ...next.hero,
    subtitle: `Diperbarui dari brief kamu: ${prompt}`,
  };
  return next;
}
