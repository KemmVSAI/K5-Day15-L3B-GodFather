import type { Drug, Interaction, ScheduleEntry } from "@shared/medication";

export { buildPharmacistText, canShowSchedule, riskSummary } from "@shared/medication";
export type { Drug, Interaction, ScheduleEntry };

export type MedicationRow = {
  id: string;
  name: string;
  details: string;
};

export const demoPresets = [
  {
    label: "Lịch theo dõi",
    description: "Không có cặp nặng trong dữ liệu demo",
    medications: ["Glucophage", "Amlodipine", "Canxi D3"],
  },
  {
    label: "Cần tách giờ",
    description: "Levothyroxine và Canxi",
    medications: ["Levothyroxine", "Canxi D3", "Omeprazole"],
  },
  {
    label: "Cảnh báo nặng",
    description: "Warfarin và Aspirin",
    medications: ["Warfarin", "Aspirin 81mg", "Metformin"],
  },
  {
    label: "Thuốc ngoài dữ liệu",
    description: "Kiểm tra trạng thái chưa xác định",
    medications: ["Metformin", "Xarelto 15mg"],
  },
] as const;

export const periodLabels = [
  { key: "sang" as const, label: "Buổi sáng" },
  { key: "trua" as const, label: "Buổi trưa" },
  { key: "toi" as const, label: "Buổi tối" },
];

export function medicationText(medications: MedicationRow[]): string {
  return medications
    .map((medication) =>
      `${medication.name.trim()}${medication.details.trim() ? ` (${medication.details.trim()})` : ""}`,
    )
    .join(", ");
}

export function validateMedicationName(name: string): string | undefined {
  const value = name.trim();
  if (!value) return "Nhập tên thuốc trên vỏ hộp hoặc đơn.";
  if (value.length < 2) return "Tên thuốc cần ít nhất 2 ký tự.";
  if (value.length > 160) return "Tên thuốc không được dài quá 160 ký tự.";
  if (/https?:\/\//i.test(value)) return "Chỉ nhập tên thuốc, không nhập đường dẫn.";
  return undefined;
}
