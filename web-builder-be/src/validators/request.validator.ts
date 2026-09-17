export interface GenerateRequest {
  businessDescription: string;
}

export interface ReviseRequest {
  currentState: unknown;
  instruction: string;
}

export interface ExportRequest {
  currentState: unknown;
}

export function parseGenerateRequest(value: unknown): GenerateRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !("businessDescription" in value) || typeof value.businessDescription !== "string") {
    return null;
  }

  const businessDescription = value.businessDescription.trim();

  if (businessDescription.length < 10 || businessDescription.length > 4000) {
    return null;
  }

  return { businessDescription };
}

export function parseInstruction(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

export function parseReviseRequest(value: unknown): ReviseRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !("currentState" in value) || !("instruction" in value)) {
    return null;
  }

  const instruction = parseInstruction(value.instruction);
  if (!instruction) {
    return null;
  }

  return { currentState: value.currentState, instruction };
}

export function parseExportRequest(value: unknown): ExportRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !("currentState" in value)) {
    return null;
  }

  return { currentState: value.currentState };
}
