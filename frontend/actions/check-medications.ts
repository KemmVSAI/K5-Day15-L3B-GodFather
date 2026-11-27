import {
  defineAction,
  defineActionErrors,
  noteExternalWrite,
} from "@agent-native/core/action";

import {
  checkMedicationBackend,
  medicationInputSchema,
  medicationOutputSchema,
} from "../server/lib/medication-backend";

const errors = defineActionErrors("backend_unavailable");

export default defineAction({
  description:
    "Kiểm tra tương tác và soạn lịch nháp từ backend Python Thuốc Nhà; không tự suy diễn kết quả y khoa.",
  searchHints: ["thuốc", "tương tác thuốc", "lịch uống thuốc"],
  schema: medicationInputSchema,
  outputSchema: medicationOutputSchema,
  errors,
  run: async ({ text }) => {
    // The read-only Python POST does not save a prescription or send a handoff.
    // observed-write-ok: this lookup is safe to repeat and has no external side effect.
    noteExternalWrite("medication-lookup");
    try {
      return await checkMedicationBackend(text);
    } catch {
      return errors.fail(
        "Không thể kết nối backend kiểm tra thuốc. Vui lòng thử lại; hệ thống không tạo kết quả thay thế.",
        "backend_unavailable",
        { statusCode: 503 },
      );
    }
  },
});
