import {
  actionErrorMessage,
  callAction,
  useActionQuery,
} from "@agent-native/core/client/hooks";

import { parseMedicationAnalysis } from "@shared/medication";

export {
  buildPharmacistText,
  canShowSchedule,
  riskSummary,
  type Drug,
  type Interaction,
  type MedicationAnalysis,
  type MedicationMeta,
  type ScheduleEntry,
} from "@shared/medication";

export async function checkMedications(text: string, signal?: AbortSignal) {
  try {
    const options: Parameters<typeof callAction>[2] = {};
    if (signal) options.signal = signal;
    const result = await callAction("check-medications", { text }, options);
    return parseMedicationAnalysis(result);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      actionErrorMessage(error) ??
        "Không thể kết nối backend kiểm tra thuốc. Danh sách của bạn vẫn được giữ nguyên; vui lòng thử lại.",
    );
  }
}

export function useBackendStatus(enabled = true) {
  return useActionQuery("backend-status", {}, { enabled });
}
