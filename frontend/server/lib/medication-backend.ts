import { z } from "zod";

import {
  medicationAnalysisSchema,
  parseMedicationAnalysis,
} from "../../shared/medication";

export const medicationInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ít nhất một tên thuốc.")
    .max(2000, "Danh sách quá dài. Vui lòng nhập tối đa 2.000 ký tự.")
    .describe(
      "Danh sách tên thuốc trên vỏ hộp hoặc đơn, cách nhau bằng dấu phẩy; không gửi thông tin cá nhân.",
    ),
});

export const medicationOutputSchema = medicationAnalysisSchema;

export function medicationBackendUrl(): string {
  const url = process.env.MEDICATION_API_URL;
  if (!url) throw new Error("MEDICATION_API_URL is not configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Unsupported medication backend protocol");
  }
  return url.replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Medication backend returned invalid JSON");
  }
}

export async function checkMedicationBackend(text: string) {
  const response = await fetch(`${medicationBackendUrl()}/api/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(90_000),
    cache: "no-store",
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error("Medication backend could not complete the check");
  }
  return parseMedicationAnalysis(payload);
}

export async function getBackendStatus() {
  try {
    const response = await fetch(`${medicationBackendUrl()}/api/status`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    const schema = z.object({
      demo_mode: z.boolean().optional(),
      drugs_count: z.number().optional(),
      interactions_count: z.number().optional(),
      sources: z.record(z.string(), z.string()).optional(),
    });
    const status = schema.parse(await readJson(response));
    return { available: response.ok, ...status };
  } catch {
    return { available: false };
  }
}
