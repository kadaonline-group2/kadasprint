export type TemplateId =
  | "template-services"
  | "template-fnb"
  | "template-retail";

export interface WebsiteState {
  templateId: TemplateId;
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

export interface GenerateRequest {
  businessDescription: string;
}

export interface ReviseRequest {
  currentState: WebsiteState;
  instruction: string;
}

export interface WebsiteStateResponse {
  state: WebsiteState;
  isFallback: boolean;
  requestId?: string;
  latencyMs?: number;
  revisionApplied?: boolean;
  changedPaths?: string[];
  fallbackReason?: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
  };
}

export class WebsiteApiError extends Error {
  code: string;
  details?: unknown;

  constructor(body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "WebsiteApiError";
    this.code = body.code;
    this.details = body.details;
  }
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}
