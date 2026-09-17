import { mockGenerateWebsite } from "./mock";
import { renderWebsite } from "./renderer";
import { WebsiteApiError } from "./types";
import type {
  ApiErrorBody,
  GenerateRequest,
  ReviseRequest,
  WebsiteState,
  WebsiteStateResponse,
} from "./types";

const API_BASE_PATH = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiPaths = {
  generate: `${API_BASE_PATH}/generate`,
  revise: `${API_BASE_PATH}/revise`,
  export: `${API_BASE_PATH}/export`,
  publish: `${API_BASE_PATH}/publish`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWebsiteState(value: unknown): value is WebsiteState {
  if (!isRecord(value)) return false;
  const theme = value.theme;
  const meta = value.meta;
  const hero = value.hero;
  const about = value.about;
  const contact = value.contact;
  const services = value.services;
  const primaryColor = isRecord(theme) ? theme.primaryColor : undefined;
  const accentColor = isRecord(theme) ? theme.accentColor : undefined;
  const highlights = isRecord(about) ? about.highlights : undefined;
  const testimonials = value.testimonials;

  return (
    (value.templateId === "template-services" ||
      value.templateId === "template-fnb" ||
      value.templateId === "template-retail") &&
    isRecord(theme) &&
    typeof primaryColor === "string" &&
    /^#[0-9A-F]{6}$/i.test(primaryColor) &&
    typeof accentColor === "string" &&
    /^#[0-9A-F]{6}$/i.test(accentColor) &&
    (theme.fontFamily === "sans" ||
      theme.fontFamily === "serif" ||
      theme.fontFamily === "display") &&
    isRecord(meta) &&
    typeof meta.businessName === "string" &&
    typeof meta.category === "string" &&
    typeof meta.tagline === "string" &&
    isRecord(hero) &&
    typeof hero.title === "string" &&
    typeof hero.subtitle === "string" &&
    typeof hero.ctaText === "string" &&
    typeof hero.ctaWhatsappMessage === "string" &&
    isRecord(about) &&
    typeof about.story === "string" &&
    (highlights === undefined ||
      (Array.isArray(highlights) &&
        highlights.every((highlight) => typeof highlight === "string"))) &&
    Array.isArray(services) &&
    services.length >= 3 &&
    services.every(
      (service) =>
        isRecord(service) &&
        typeof service.name === "string" &&
        typeof service.description === "string" &&
        typeof service.priceEstimate === "string" &&
        (service.iconKeyword === undefined ||
          typeof service.iconKeyword === "string"),
    ) &&
    Array.isArray(testimonials) &&
    testimonials.length >= 2 &&
    testimonials.every(
      (testimonial) =>
        isRecord(testimonial) &&
        typeof testimonial.customerName === "string" &&
        typeof testimonial.review === "string",
    ) &&
    isRecord(contact) &&
    (contact.whatsappNumber === null ||
      (typeof contact.whatsappNumber === "string" &&
        /^62[0-9]{8,13}$/.test(contact.whatsappNumber))) &&
    typeof contact.address === "string" &&
    (contact.instagram === undefined || typeof contact.instagram === "string")
  );
}

function parseStateResponse(payload: unknown): WebsiteStateResponse {
  if (!isRecord(payload)) {
    throw new WebsiteApiError({
      code: "INVALID_RESPONSE",
      message: "Backend mengembalikan response yang tidak valid.",
    });
  }

  const data = payload.data;
  const meta = payload.meta;
  if (payload.success !== true || !isWebsiteState(data)) {
    throw new WebsiteApiError({
      code: "INVALID_RESPONSE",
      message: "WebsiteState dari backend tidak valid.",
    });
  }

  const responseMeta = isRecord(meta) ? meta : {};

  return {
    state: data,
    isFallback: responseMeta.isFallback === true,
    requestId:
      typeof responseMeta.requestId === "string"
        ? responseMeta.requestId
        : undefined,
    latencyMs:
      typeof responseMeta.latencyMs === "number"
        ? responseMeta.latencyMs
        : undefined,
    revisionApplied:
      typeof responseMeta.revisionApplied === "boolean"
        ? responseMeta.revisionApplied
        : undefined,
    changedPaths: Array.isArray(responseMeta.changedPaths)
      ? responseMeta.changedPaths.filter(
          (path): path is string => typeof path === "string",
        )
      : undefined,
    fallbackReason:
      typeof responseMeta.fallbackReason === "string"
        ? responseMeta.fallbackReason
        : undefined,
  };
}

type FetchLike = typeof fetch;

async function requestJson<T>(
  path: string,
  body: T,
  fetchImpl: FetchLike,
): Promise<WebsiteStateResponse> {
  const response = await fetchImpl(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = isRecord(payload)
      ? (payload as Partial<ApiErrorBody>)
      : {};
    throw new WebsiteApiError(
      errorBody.error ?? {
        code: `HTTP_${response.status}`,
        message: "Permintaan ke backend gagal.",
      },
    );
  }

  return parseStateResponse(payload);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadImageZip(state: WebsiteState, heroImageDataUrl: string): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("index.html", renderWebsite(state, heroImageDataUrl));
  triggerDownload(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), "website.zip");
}

export interface WebsiteApi {
  generate(request: GenerateRequest): Promise<WebsiteStateResponse>;
  revise(request: ReviseRequest): Promise<WebsiteStateResponse>;
  download(state: WebsiteState, heroImageDataUrl?: string): Promise<void>;
}

function createMockApi(): WebsiteApi {
  return {
    async generate({ businessDescription }) {
      return {
        state: await mockGenerateWebsite(businessDescription),
        isFallback: false,
        requestId: "mock-generate",
        latencyMs: 650,
      };
    },
    async revise({ currentState, instruction }) {
      return {
        state: await mockGenerateWebsite(instruction, currentState),
        isFallback: false,
        requestId: "mock-revise",
        latencyMs: 650,
        revisionApplied: true,
      };
    },
    async download(state, heroImageDataUrl) {
      if (heroImageDataUrl) return downloadImageZip(state, heroImageDataUrl);
      triggerDownload(
        new Blob([renderWebsite(state)], { type: "text/html" }),
        `${state.meta.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "website"}.html`,
      );
    },
  };
}

function createRealApi(fetchImpl: FetchLike): WebsiteApi {
  return {
    generate: (request) => requestJson(apiPaths.generate, request, fetchImpl),
    revise: (request) => requestJson(apiPaths.revise, request, fetchImpl),
    download: async (state, heroImageDataUrl) => {
      if (heroImageDataUrl) return downloadImageZip(state, heroImageDataUrl);
      const response = await fetchImpl(apiPaths.export, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ currentState: state }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const errorBody = isRecord(payload)
          ? (payload as Partial<ApiErrorBody>)
          : {};
        throw new WebsiteApiError(
          errorBody.error ?? {
            code: `HTTP_${response.status}`,
            message: "Export website gagal.",
          },
        );
      }
      triggerDownload(await response.blob(), "website.zip");
    },
  };
}

export function createWebsiteApi(
  options: {
    mode?: string;
    fetchImpl?: FetchLike;
  } = {},
): WebsiteApi {
  const mode = options.mode ?? import.meta.env.VITE_API_MODE;
  if (mode === "real") {
    return createRealApi(options.fetchImpl ?? fetch);
  }
  return createMockApi();
}

export const websiteApi: WebsiteApi = createWebsiteApi();
