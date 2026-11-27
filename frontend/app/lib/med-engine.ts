export type PeriodLabel =
  | "Buổi sáng"
  | "Buổi trưa"
  | "Buổi tối"
  | "Trước khi ngủ";

export interface MedicationInput {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  timing: PeriodLabel;
  notes: string;
}

export interface DrugRecord {
  code: string;
  genericName: string;
  aliases: string[];
  drugClass: string;
  recommendedTiming: PeriodLabel;
  mealNote: string;
  timingNote: string;
}

export interface InteractionRecord {
  code: string;
  drugA: string;
  drugB: string;
  severity: "nang" | "trung_binh" | "nhe";
  action: "hoi_duoc_si" | "tach_gio" | "theo_doi";
  summary: string;
  recommendation: string;
}

export interface EvaluationResult {
  tone: "green" | "yellow" | "red" | "neutral";
  badge: string;
  title: string;
  description: string;
  matchedDrugs: Array<{ inputName: string; record: DrugRecord }>;
  unknownDrugs: string[];
  duplicateGenerics: string[];
  interactions: InteractionRecord[];
  hasSevere: boolean;
  needsPharmacist: boolean;
  canApplySeparation: boolean;
}

export const DRUG_CATALOG: DrugRecord[] = [
  {
    code: "DRUG-01",
    genericName: "Metformin",
    aliases: ["Glucophage", "Siofor", "Metformin Stella", "Metformin"],
    drugClass: "Đái tháo đường",
    recommendedTiming: "Buổi sáng",
    mealNote: "Sau ăn",
    timingNote: "Uống ngay trong hoặc sau bữa ăn để giảm kích ứng dạ dày",
  },
  {
    code: "DRUG-02",
    genericName: "Glimepiride",
    aliases: ["Amaryl", "Glimepiride"],
    drugClass: "Đái tháo đường",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước ăn",
    timingNote: "Uống ngay trước hoặc cùng bữa sáng chính; tránh bỏ bữa",
  },
  {
    code: "DRUG-03",
    genericName: "Amlodipine",
    aliases: ["Amlor", "Amlodipin", "Amlodipine"],
    drugClass: "Huyết áp",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống cố định một giờ mỗi ngày",
  },
  {
    code: "DRUG-04",
    genericName: "Perindopril",
    aliases: ["Coversyl", "Perindopril"],
    drugClass: "Huyết áp / tim mạch",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước ăn",
    timingNote: "Thường uống 1 lần vào buổi sáng trước ăn",
  },
  {
    code: "DRUG-05",
    genericName: "Losartan",
    aliases: ["Cozaar", "Losartan"],
    drugClass: "Huyết áp / tim mạch",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống cố định một giờ mỗi ngày",
  },
  {
    code: "DRUG-06",
    genericName: "Bisoprolol",
    aliases: ["Concor", "Bisoprolol"],
    drugClass: "Tim mạch",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống buổi sáng, không tự ý ngừng thuốc đột ngột",
  },
  {
    code: "DRUG-07",
    genericName: "Spironolactone",
    aliases: ["Aldactone", "Spironolactone"],
    drugClass: "Lợi tiểu giữ kali",
    recommendedTiming: "Buổi sáng",
    mealNote: "Sau ăn",
    timingNote: "Uống buổi sáng sau ăn để tránh tiểu đêm",
  },
  {
    code: "DRUG-08",
    genericName: "Furosemide",
    aliases: ["Lasix", "Furosemid", "Furosemide"],
    drugClass: "Lợi tiểu quai",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống buổi sáng (trước 15h) để tránh tiểu đêm",
  },
  {
    code: "DRUG-09",
    genericName: "Atorvastatin",
    aliases: ["Lipitor", "Atorvastatin"],
    drugClass: "Mỡ máu",
    recommendedTiming: "Buổi tối",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống cố định một giờ mỗi ngày, thường vào buổi tối",
  },
  {
    code: "DRUG-10",
    genericName: "Simvastatin",
    aliases: ["Zocor", "Simvastatin"],
    drugClass: "Mỡ máu",
    recommendedTiming: "Buổi tối",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Nên uống vào buổi tối để đạt hiệu quả kiểm soát mỡ máu tốt nhất",
  },
  {
    code: "DRUG-11",
    genericName: "Aspirin",
    aliases: ["Aspirin 81mg", "Aspirin 81", "Aspirin pH8", "Aspirin"],
    drugClass: "Chống kết tập tiểu cầu",
    recommendedTiming: "Buổi sáng",
    mealNote: "Sau ăn",
    timingNote: "Uống sau bữa sáng với nhiều nước để giảm kích ứng dạ dày",
  },
  {
    code: "DRUG-12",
    genericName: "Clopidogrel",
    aliases: ["Plavix", "Clopidogrel"],
    drugClass: "Chống kết tập tiểu cầu",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống 1 lần/ngày vào giờ cố định",
  },
  {
    code: "DRUG-13",
    genericName: "Warfarin",
    aliases: ["Coumadin", "Warfarin"],
    drugClass: "Chống đông máu",
    recommendedTiming: "Buổi tối",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống đúng 1 giờ cố định buổi chiều tối, theo dõi INR định kỳ",
  },
  {
    code: "DRUG-14",
    genericName: "Omeprazole",
    aliases: ["Losec", "Omeprazol", "Omeprazole"],
    drugClass: "Dạ dày (PPI)",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước ăn 30 phút",
    timingNote: "Uống trước bữa sáng 30 phút, nuốt nguyên viên",
  },
  {
    code: "DRUG-15",
    genericName: "Levothyroxine",
    aliases: ["Levothyrox", "Berlthyrox", "Euthyrox", "Levothyroxine"],
    drugClass: "Tuyến giáp",
    recommendedTiming: "Buổi sáng",
    mealNote: "Lúc đói trước ăn 30–60 phút",
    timingNote: "Uống sáng sớm lúc đói với nước lọc, cách canxi và thuốc dạ dày ≥ 4 giờ",
  },
  {
    code: "DRUG-16",
    genericName: "Calcium + Vitamin D3",
    aliases: ["Canxi D3", "Calci D", "Calcium D3", "Canxi", "Calcium"],
    drugClass: "Bổ sung xương khớp",
    recommendedTiming: "Buổi trưa",
    mealNote: "Sau ăn",
    timingNote: "Uống sau ăn trưa để hấp thu tốt và tránh uống gần thuốc tuyến giáp",
  },
  {
    code: "DRUG-17",
    genericName: "Ibuprofen",
    aliases: ["Brufen", "Advil", "Ibuprofen"],
    drugClass: "Giảm đau kháng viêm (NSAID)",
    recommendedTiming: "Buổi trưa",
    mealNote: "Sau ăn no",
    timingNote: "Chỉ dùng khi cần, luôn uống ngay sau ăn no",
  },
  {
    code: "DRUG-18",
    genericName: "Paracetamol",
    aliases: ["Panadol", "Efferalgan", "Hapacol", "Tylenol", "Paracetamol"],
    drugClass: "Giảm đau hạ sốt",
    recommendedTiming: "Buổi sáng",
    mealNote: "Trước hoặc sau ăn",
    timingNote: "Uống khi cần, mỗi lần cách nhau ít nhất 4–6 giờ",
  },
];

export const INTERACTIONS: InteractionRecord[] = [
  {
    code: "INT-01",
    drugA: "Warfarin",
    drugB: "Aspirin",
    severity: "nang",
    action: "hoi_duoc_si",
    summary:
      "Dùng chung Warfarin và Aspirin làm tăng mạnh nguy cơ xuất huyết tiêu hóa và chảy máu nặng.",
    recommendation:
      "Không tự xếp lịch dùng chung; cần hỏi bác sĩ hoặc dược sĩ xác nhận lại đơn thuốc trước khi cho cha mẹ uống.",
  },
  {
    code: "INT-02",
    drugA: "Warfarin",
    drugB: "Ibuprofen",
    severity: "nang",
    action: "hoi_duoc_si",
    summary:
      "Ibuprofen (NSAID) làm tăng mạnh nguy cơ loét và xuất huyết tiêu hóa khi dùng cùng Warfarin.",
    recommendation:
      "Không tự ý dùng Ibuprofen chung với Warfarin; liên hệ dược sĩ hoặc bác sĩ để chọn hướng giảm đau an toàn hơn.",
  },
  {
    code: "INT-03",
    drugA: "Warfarin",
    drugB: "Paracetamol",
    severity: "trung_binh",
    action: "hoi_duoc_si",
    summary:
      "Dùng Paracetamol liều cao hoặc kéo dài nhiều ngày có thể làm tăng tác dụng chống đông của Warfarin.",
    recommendation:
      "Hỏi dược sĩ về liều tối đa an toàn khi dùng ngắn hạn và theo dõi dấu hiệu bầm tím, chảy máu.",
  },
  {
    code: "INT-04",
    drugA: "Clopidogrel",
    drugB: "Omeprazole",
    severity: "nang",
    action: "hoi_duoc_si",
    summary:
      "Omeprazole làm giảm hoạt hóa Clopidogrel qua men gan CYP2C19, làm giảm hiệu quả chống cục máu đông.",
    recommendation:
      "Cảnh báo ngay để hỏi bác sĩ hoặc dược sĩ cân nhắc đổi sang thuốc dạ dày ít tương tác hơn.",
  },
  {
    code: "INT-05",
    drugA: "Aspirin",
    drugB: "Ibuprofen",
    severity: "nang",
    action: "hoi_duoc_si",
    summary:
      "Tăng nguy cơ loét dạ dày và Ibuprofen có thể cản trở tác dụng bảo vệ tim mạch của Aspirin liều thấp.",
    recommendation:
      "Không tự ý kết hợp; cần hỏi dược sĩ trước khi dùng thêm Ibuprofen.",
  },
  {
    code: "INT-06",
    drugA: "Perindopril",
    drugB: "Spironolactone",
    severity: "nang",
    action: "hoi_duoc_si",
    summary:
      "Phối hợp ức chế men chuyển (Perindopril) và lợi tiểu giữ kali (Spironolactone) làm tăng nguy cơ tăng kali máu.",
    recommendation:
      "Chỉ dùng cùng khi có theo dõi xét nghiệm kali máu của bác sĩ; chuyển dược sĩ kiểm tra lại đơn.",
  },
  {
    code: "INT-07",
    drugA: "Perindopril",
    drugB: "Ibuprofen",
    severity: "trung_binh",
    action: "hoi_duoc_si",
    summary:
      "Ibuprofen có thể làm giảm hiệu quả hạ huyết áp của Perindopril và tăng nguy cơ tổn thương thận ở người cao tuổi.",
    recommendation:
      "Tránh tự mua thêm Ibuprofen; hỏi dược sĩ để chọn thuốc giảm đau phù hợp.",
  },
  {
    code: "INT-08",
    drugA: "Losartan",
    drugB: "Ibuprofen",
    severity: "trung_binh",
    action: "hoi_duoc_si",
    summary:
      "Ibuprofen làm giảm tác dụng hạ huyết áp của Losartan và tăng nguy cơ ảnh hưởng chức năng thận.",
    recommendation:
      "Hỏi ý kiến bác sĩ hoặc dược sĩ trước khi dùng chung với thuốc giảm đau NSAID.",
  },
  {
    code: "INT-09",
    drugA: "Levothyroxine",
    drugB: "Calcium + Vitamin D3",
    severity: "trung_binh",
    action: "tach_gio",
    summary:
      "Canxi làm giảm mạnh hấp thu Levothyroxine nếu uống gần nhau trong đường tiêu hóa.",
    recommendation:
      "Tách giờ uống ít nhất 4 giờ: Levothyroxine sáng sớm lúc đói (trước ăn 30–60 phút), Canxi D3 chuyển sang sau bữa trưa.",
  },
  {
    code: "INT-10",
    drugA: "Levothyroxine",
    drugB: "Omeprazole",
    severity: "trung_binh",
    action: "tach_gio",
    summary:
      "Omeprazole làm giảm axit dạ dày, có thể làm giảm hấp thu Levothyroxine nếu uống cùng lúc.",
    recommendation:
      "Ưu tiên uống Levothyroxine trước bữa sáng 60 phút và tách xa Omeprazole (hoặc hỏi dược sĩ chuyển cữ Omeprazole sang tối).",
  },
  {
    code: "INT-11",
    drugA: "Simvastatin",
    drugB: "Amlodipine",
    severity: "trung_binh",
    action: "hoi_duoc_si",
    summary:
      "Amlodipine làm tăng nồng độ Simvastatin trong máu, tăng nguy cơ tác dụng phụ đau cơ.",
    recommendation:
      "Kiểm tra lại hàm lượng Simvastatin (thường khuyến cáo không quá 20 mg/ngày khi dùng cùng Amlodipine) với dược sĩ.",
  },
  {
    code: "INT-12",
    drugA: "Metformin",
    drugB: "Furosemide",
    severity: "nhe",
    action: "theo_doi",
    summary:
      "Furosemide có thể làm thay đổi nhẹ nồng độ Metformin hoặc đường huyết.",
    recommendation:
      "Có thể xếp theo cữ bác sĩ kê, theo dõi đường huyết đều và báo bác sĩ nếu mệt bất thường.",
  },
];

export function normalizeText(value: string): string {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findDrugRecord(rawName: string): DrugRecord | null {
  const normInput = normalizeText(rawName);
  if (!normInput) return null;
  const cleaned = normInput.replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu|vien)\b/g, "").trim();

  for (const drug of DRUG_CATALOG) {
    const candidates = [drug.genericName, ...drug.aliases].map(normalizeText);
    if (
      candidates.some(
        (c) =>
          c === normInput ||
          c === cleaned ||
          (cleaned.length >= 4 && normInput.includes(c)),
      )
    ) {
      return drug;
    }
  }
  return null;
}

export function evaluateMedications(medications: MedicationInput[]): EvaluationResult {
  const matchedDrugs: Array<{ inputName: string; record: DrugRecord }> = [];
  const unknownDrugs: string[] = [];
  const genericCounts = new Map<string, number>();

  for (const med of medications) {
    const trimmed = med.name.trim();
    if (!trimmed) continue;
    const record = findDrugRecord(trimmed);
    if (record) {
      matchedDrugs.push({ inputName: trimmed, record });
      genericCounts.set(
        record.genericName,
        (genericCounts.get(record.genericName) ?? 0) + 1,
      );
    } else {
      unknownDrugs.push(trimmed);
    }
  }

  const duplicateGenerics = Array.from(genericCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  const uniqueGenerics = Array.from(genericCounts.keys());
  const foundInteractions: InteractionRecord[] = [];
  for (let i = 0; i < uniqueGenerics.length; i++) {
    for (let j = i + 1; j < uniqueGenerics.length; j++) {
      const a = uniqueGenerics[i]!;
      const b = uniqueGenerics[j]!;
      const hit = INTERACTIONS.find(
        (row) =>
          (row.drugA === a && row.drugB === b) ||
          (row.drugA === b && row.drugB === a),
      );
      if (hit) foundInteractions.push(hit);
    }
  }

  const severityOrder = { nang: 3, trung_binh: 2, nhe: 1 };
  foundInteractions.sort(
    (x, y) => severityOrder[y.severity] - severityOrder[x.severity],
  );

  const hasSevere = foundInteractions.some((r) => r.severity === "nang");
  const hasMedium = foundInteractions.some((r) => r.severity === "trung_binh");
  const hasMinor = foundInteractions.some((r) => r.severity === "nhe");
  const canApplySeparation = foundInteractions.some(
    (r) => r.action === "tach_gio",
  );
  const needsPharmacist =
    hasSevere ||
    unknownDrugs.length > 0 ||
    duplicateGenerics.length > 0 ||
    foundInteractions.some((r) => r.action === "hoi_duoc_si");

  if (hasSevere) {
    return {
      tone: "red",
      badge: "Cảnh báo nặng",
      title: "Tạm dừng xếp lịch — cần hỏi bác sĩ hoặc dược sĩ",
      description:
        "Phát hiện cặp thuốc tương tác mức nặng. Không tự chốt lịch uống chung trước khi có xác nhận chuyên môn.",
      matchedDrugs,
      unknownDrugs,
      duplicateGenerics,
      interactions: foundInteractions,
      hasSevere,
      needsPharmacist,
      canApplySeparation,
    };
  }

  if (unknownDrugs.length > 0 || duplicateGenerics.length > 0) {
    return {
      tone: "neutral",
      badge: duplicateGenerics.length ? "Trùng hoạt chất" : "Ngoài danh mục",
      title: duplicateGenerics.length
        ? "Có thuốc trùng hoạt chất — cần kiểm tra lại"
        : "Có thuốc chưa nằm trong 18 hoạt chất mẫu",
      description: duplicateGenerics.length
        ? `Phát hiện nhiều thuốc cùng chứa ${duplicateGenerics.join(", ")}. Tránh uống chồng liều gây hại gan hoặc quá liều.`
        : `Chưa có dữ liệu cho: ${unknownDrugs.join(", ")}. Hệ thống không tự suy đoán tương tác với thuốc ngoài danh mục.`,
      matchedDrugs,
      unknownDrugs,
      duplicateGenerics,
      interactions: foundInteractions,
      hasSevere,
      needsPharmacist,
      canApplySeparation,
    };
  }

  if (hasMedium) {
    return {
      tone: "yellow",
      badge: canApplySeparation ? "Cần tách giờ" : "Cần lưu ý",
      title: canApplySeparation
        ? "Cần tách giờ uống tối thiểu 4 giờ"
        : "Có tương tác mức trung bình cần theo dõi",
      description: canApplySeparation
        ? "Hai thuốc có thể làm giảm hấp thu của nhau nếu uống cùng buổi. Hãy tách cữ sáng sớm và buổi trưa."
        : "Nên kiểm tra lại liều lượng hoặc cách phối hợp với dược sĩ trước khi duy trì dài ngày.",
      matchedDrugs,
      unknownDrugs,
      duplicateGenerics,
      interactions: foundInteractions,
      hasSevere,
      needsPharmacist,
      canApplySeparation,
    };
  }

  if (hasMinor) {
    return {
      tone: "green",
      badge: "Theo dõi nhẹ",
      title: "Có thể xếp lịch nháp kèm theo dõi",
      description:
        "Chỉ ghi nhận tương tác mức nhẹ trong danh mục dữ liệu. Theo dõi thêm chỉ số sức khỏe theo hướng dẫn.",
      matchedDrugs,
      unknownDrugs,
      duplicateGenerics,
      interactions: foundInteractions,
      hasSevere,
      needsPharmacist,
      canApplySeparation,
    };
  }

  return {
    tone: "green",
    badge: "An toàn",
    title: "Chưa ghi nhận cặp tương tác trong dữ liệu",
    description:
      "Các thuốc đã nhập không có cặp kị nhau trong bảng 12 tương tác phổ biến. Đối chiếu lại đơn bác sĩ trước khi cho cha mẹ dùng.",
    matchedDrugs,
    unknownDrugs,
    duplicateGenerics,
    interactions: foundInteractions,
    hasSevere,
    needsPharmacist,
    canApplySeparation,
  };
}

export function buildPharmacistDraftText(
  medications: MedicationInput[],
  result: EvaluationResult,
): string {
  const medLines = medications
    .filter((m) => m.name.trim())
    .map(
      (m, i) =>
        `${i + 1}. ${m.name}${m.dose ? ` (${m.dose})` : ""} — ${m.timing}${m.notes ? `, ${m.notes}` : ""}`,
    )
    .join("\n");

  const interLines = result.interactions.length
    ? result.interactions
        .map((r) => `- [${r.code}] ${r.drugA} + ${r.drugB} (${r.severity}): ${r.summary}`)
        .join("\n")
    : "- Chưa ghi nhận tương tác trong 18 hoạt chất mẫu.";

  const extra =
    result.unknownDrugs.length > 0
      ? `\nThuốc ngoài danh mục cần kiểm tra: ${result.unknownDrugs.join(", ")}`
      : "";

  return `Nhờ dược sĩ kiểm tra giúp đơn thuốc cho người nhà:\n${medLines}\n\nĐiểm hệ thống ghi nhận:\n${interLines}${extra}\n\nXin hỏi lịch uống trong ngày như trên có an toàn không và cần điều chỉnh giờ nào?`;
}
