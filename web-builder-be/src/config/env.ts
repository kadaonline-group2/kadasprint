import "dotenv/config";

export const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

export function getAiServiceConfig(): { baseUrl: string; timeoutMs: number; token?: string } {
  const baseUrl = process.env.AI_SERVICE_BASE_URL ?? "http://localhost:3001";
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS ?? "45000");

  if (!URL.canParse(baseUrl) || !["http:", "https:"].includes(new URL(baseUrl).protocol)) {
    throw new Error("AI_SERVICE_BASE_URL must be an HTTP URL");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("AI_SERVICE_TIMEOUT_MS must be a positive integer");
  }

  return { baseUrl, timeoutMs, token: process.env.AI_SERVICE_TOKEN || undefined };
}

export function getPort(): number {
  const port = Number(process.env.PORT ?? "3000");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}
