import { z } from "zod";

const drugSchema = z.object({
  code: z.string(),
  generic_name: z.string(),
  drug_class: z.string(),
  match_type: z.string().optional(),
  matched_term: z.string().optional(),
});

const interactionSchema = z.object({
  code: z.string(),
  drug_a: z.string(),
  drug_b: z.string(),
  severity: z.enum(["nang", "trung_binh", "nhe"]),
  action: z.string(),
  summary: z.string(),
  recommendation: z.string(),
});

const scheduleEntrySchema = z.object({
  code: z.string(),
  generic_name: z.string(),
  meal_relation: z.string().optional(),
  meal_label: z.string(),
  timing_note: z.string(),
  status: z.string(),
});

export const medicationAnalysisSchema = z.object({
  output: z.string(),
  meta: z.object({
    mode: z.enum(["mock", "real"]).optional(),
    outcome: z.enum([
      "checked",
      "need_input",
      "emergency",
      "out_of_scope",
    ]),
    overall: z.string().optional(),
    data_sources: z
      .object({ drugs: z.string(), interactions: z.string() })
      .optional(),
    drugs_found: z.array(drugSchema).default([]),
    fuzzy_matches: z
      .array(
        z.object({
          input: z.string(),
          matched_generic: z.string(),
          code: z.string(),
        }),
      )
      .default([]),
    unknown_drugs: z.array(z.string()).default([]),
    interactions: z.array(interactionSchema).default([]),
    checked_pairs: z.number().int().nonnegative().optional(),
    schedule: z
      .object({
        slots: z
          .object({
            sang: z.array(scheduleEntrySchema).default([]),
            trua: z.array(scheduleEntrySchema).default([]),
            toi: z.array(scheduleEntrySchema).default([]),
          })
          .optional(),
        held_for_pharmacist: z
          .array(
            z.object({
              code: z.string(),
              pair: z.string(),
              recommendation: z.string().optional(),
            }),
          )
          .default([]),
        separation_notes: z.array(z.string()).default([]),
        is_draft: z.boolean().optional(),
        can_present_schedule: z.boolean(),
      })
      .optional(),
    handoff: z
      .object({
        draft_id: z.string(),
        reason: z.string(),
        status: z.string(),
        sent: z.boolean(),
        priority: z.string(),
        drugs: z.array(z.string()).default([]),
        interaction_codes: z.array(z.string()).default([]),
      })
      .nullable()
      .optional(),
    guardrails: z
      .object({
        bypass_attack: z.boolean(),
        refusals: z.array(
          z.object({
            code: z.string(),
            scope: z.string(),
            guidance: z.string(),
          }),
        ),
      })
      .optional(),
    red_flags: z.array(z.string()).default([]),
    note: z.string().optional(),
  }),
});

export type MedicationAnalysis = z.infer<typeof medicationAnalysisSchema>;
export type MedicationMeta = MedicationAnalysis["meta"];
export type Drug = z.infer<typeof drugSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export type RiskSummary = {
  tone: "green" | "yellow" | "red" | "neutral";
  title: string;
  description: string;
  label: string;
};

export function riskSummary(meta: MedicationMeta): RiskSummary {
  const severe = meta.interactions.filter(
    (interaction) => interaction.severity === "nang",
  ).length;
  const other = meta.interactions.length - severe;

  if (severe > 0) {
    return {
      tone: "red",
      title: `Có ${severe} cặp tương tác mức nặng cần trao đổi với dược sĩ`,
      description:
        "Không hiển thị lịch uống cho danh sách này. Hãy trao đổi với bác sĩ hoặc dược sĩ trước khi dùng chung; không tự ý ngừng, thay thuốc hoặc đổi liều.",
      label: "Cần tư vấn",
    };
  }
  if (meta.unknown_drugs.length > 0) {
    return {
      tone: "neutral",
      title: "Chưa đủ dữ liệu để đánh giá toàn bộ danh sách",
      description: `${meta.unknown_drugs.length} thuốc chưa có trong dữ liệu. Kết quả chỉ áp dụng cho các thuốc đã nhận diện; chưa thể kết luận về toàn bộ danh sách.`,
      label: "Chưa xác định",
    };
  }
  if (other > 0) {
    return {
      tone: "yellow",
      title: `Có ${other} cặp tương tác cần lưu ý`,
      description:
        "Đọc khuyến nghị cho từng cặp bên dưới. Lịch nháp, nếu có, chỉ dựa trên dữ liệu hiện có và cần đối chiếu với đơn của người nhà.",
      label: "Cần lưu ý",
    };
  }
  return {
    tone: "green",
    title: "Chưa ghi nhận tương tác trong dữ liệu này",
    description: `Đã kiểm tra ${meta.checked_pairs ?? "—"} cặp thuốc nhận diện được. Điều này không có nghĩa danh sách chắc chắn an toàn hay đã thay thế đánh giá của dược sĩ.`,
    label: "Trong phạm vi dữ liệu",
  };
}

export function canShowSchedule(meta: MedicationMeta): boolean {
  return (
    meta.schedule?.can_present_schedule === true &&
    Boolean(meta.schedule.slots) &&
    meta.unknown_drugs.length === 0 &&
    !meta.interactions.some((interaction) => interaction.severity === "nang")
  );
}

export function buildPharmacistText(meta: MedicationMeta): string {
  const lines = [
    "THÔNG TIN ĐỂ TRAO ĐỔI VỚI DƯỢC SĨ / BÁC SĨ",
    "",
    `Thuốc đã nhận diện: ${meta.drugs_found.map((drug) => `${drug.generic_name} [${drug.code}]`).join(", ") || "Chưa có"}`,
    `Thuốc chưa có trong dữ liệu: ${meta.unknown_drugs.join(", ") || "Không có"}`,
  ];

  if (meta.interactions.length > 0) {
    lines.push("", "Các cặp tương tác từ dữ liệu demo:");
    for (const item of meta.interactions) {
      lines.push(
        `- [${item.code}] ${item.drug_a} + ${item.drug_b}: ${item.summary}`,
        `  Khuyến nghị trong dữ liệu: ${item.recommendation}`,
      );
    }
  } else if (meta.outcome === "checked") {
    lines.push("", "Chưa ghi nhận cặp tương tác trong bộ dữ liệu demo.");
  }

  if (meta.handoff) {
    lines.push(
      "",
      `Lý do cần trao đổi: ${meta.handoff.reason}`,
      `Mã phiếu nháp: ${meta.handoff.draft_id} (chưa gửi)`,
    );
  }
  lines.push(
    "",
    "Tôi muốn hỏi về cách phối hợp và thời điểm dùng các thuốc trên cho người nhà. Mong dược sĩ/bác sĩ hướng dẫn cụ thể.",
    "Tôi không tự ý ngừng, thay thuốc hoặc thay đổi liều theo kết quả này.",
  );
  return lines.join("\n");
}

export function parseMedicationAnalysis(value: unknown): MedicationAnalysis {
  const result = medicationAnalysisSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      "Backend trả dữ liệu chưa đầy đủ hoặc không đúng định dạng. Vui lòng thử lại; hệ thống không suy diễn kết quả bị thiếu.",
    );
  }
  return result.data;
}
