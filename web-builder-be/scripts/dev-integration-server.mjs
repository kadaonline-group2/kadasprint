import appModule from "../dist/src/app.js";
import aiServiceModule from "../dist/src/clients/http-ai-service.client.js";
import envModule from "../dist/src/config/env.js";
import whatsappModule from "../dist/src/services/whatsapp.js";
import fixtureModule from "../dist/tests/fixtures/website-state.js";

const { createApp } = appModule;
const { AiServiceHttpError } = aiServiceModule;
const { getPort } = envModule;
const { normalizeWhatsappNumber } = whatsappModule;
const { validState } = fixtureModule;

function success(data, requestId) {
  return {
    success: true,
    data,
    meta: { requestId, attempts: 1, isFallback: false, latencyMs: 0 },
  };
}

function numberFrom(description) {
  const candidates = description.matchAll(/(?<!\d)(?:\+?62|0)(?:[\s().-]*\d){8,13}(?![\s().-]*\d)/g);
  for (const candidate of candidates) {
    const number = normalizeWhatsappNumber(candidate[0]);
    if (number) return number;
  }
  return null;
}

function generatedState(description) {
  const state = structuredClone(validState);
  const suppliedNumber = numberFrom(description);
  state.contact.whatsappNumber = suppliedNumber;
  if (!/barbershop|potong rambut|jasa/i.test(description)) {
    return state;
  }

  state.templateId = "template-services";
  state.meta = {
    businessName: "Barbershop Ganteng",
    category: "Jasa",
    tagline: "Potongan rapi untuk aktivitas sehari-hari",
  };
  state.hero = {
    title: "Tampil Rapi, Lebih Percaya Diri",
    subtitle: "Layanan potong rambut pria di Bandung.",
    ctaText: "Reservasi Sekarang",
    ctaWhatsappMessage: "Halo, saya ingin reservasi potong rambut",
  };
  state.about = { story: "Barbershop untuk potongan rambut yang rapi dan nyaman." };
  state.services = [
    { name: "Potong Rambut", description: "Potongan sesuai gaya Anda.", priceEstimate: "Rp35.000" },
    { name: "Rapikan Jenggot", description: "Perawatan jenggot yang rapi.", priceEstimate: "Rp20.000" },
    { name: "Hair Styling", description: "Penataan rambut untuk acara khusus.", priceEstimate: "Rp25.000" },
  ];
  state.testimonials = [
    { customerName: "Rizky", review: "Potongannya rapi dan pelayanannya ramah." },
    { customerName: "Andi", review: "Tempat nyaman dan hasilnya sesuai harapan." },
  ];
  state.contact = { whatsappNumber: suppliedNumber, address: "Bandung" };
  return state;
}

const aiServiceClient = {
  async health({ requestId }) {
    return {
      success: true,
      data: { status: "ok", service: "ai-website-builder-ai-service" },
      meta: { requestId },
    };
  },

  async generate({ businessDescription, requestId }) {
    return success({ websiteState: generatedState(businessDescription) }, requestId);
  },

  async revise({ instruction, requestId }) {
    const normalizedInstruction = instruction.toLowerCase();

    if (normalizedInstruction.includes("simulasi gagal")) {
      throw new Error("Simulated AI service failure");
    }

    let mutation;
    if (normalizedInstruction.includes("pisang goreng keju")) {
      mutation = {
        intent: "ADD_SERVICE",
        changedPaths: ["services"],
        services: {
          append: [{
            name: "Pisang Goreng Keju",
            description: "Pisang goreng hangat dengan taburan keju.",
            priceEstimate: "Rp15.000",
            iconKeyword: "banana",
          }],
        },
      };
    } else if (normalizedInstruction.includes("nomor whatsapp") &&
      normalizedInstruction.includes("hapus")) {
      mutation = {
        intent: "UPDATE_CONTACT",
        changedPaths: ["contact.whatsappNumber"],
        contact: { whatsappNumber: null },
      };
    } else if (normalizedInstruction.includes("nomor whatsapp")) {
      const candidate = numberFrom(instruction);
      if (candidate) {
        mutation = {
          intent: "UPDATE_CONTACT",
          changedPaths: ["contact.whatsappNumber"],
          contact: { whatsappNumber: candidate },
        };
      }
    } else if (normalizedInstruction.includes("navy")) {
      mutation = {
        intent: "UPDATE_THEME",
        changedPaths: ["theme.primaryColor", "theme.accentColor"],
        theme: { primaryColor: "#1B2A41", accentColor: "#D6E4F0" },
      };
    } else if (normalizedInstruction.includes("warna") || normalizedInstruction.includes("cokelat")) {
      mutation = {
        intent: "UPDATE_THEME",
        changedPaths: ["theme.primaryColor", "theme.accentColor"],
        theme: { primaryColor: "#4A2C20", accentColor: "#D7B899" },
      };
    } else {
      throw new AiServiceHttpError(422, {
        success: false,
        error: { code: "AI_UNSUPPORTED_REVISION", message: "Revision is not supported" },
        meta: { requestId },
      });
    }

    if (!mutation) {
      throw new AiServiceHttpError(422, {
        success: false,
        error: { code: "AI_UNSUPPORTED_REVISION", message: "Revision is not supported" },
        meta: { requestId },
      });
    }
    return success({ mutation }, requestId);
  },
};

const port = getPort();
createApp(aiServiceClient).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Integration backend listening on http://localhost:${port}\n`);
});
