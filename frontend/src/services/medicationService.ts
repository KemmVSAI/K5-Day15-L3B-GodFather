import {
  CATALOG_METADATA,
  DRUG_CATALOG,
  INTERACTIONS_CATALOG,
  MEAL_LABELS,
  RED_FLAG_PATTERNS,
} from '@/mocks/syntheticDataset';
import { PRESET_SCENARIOS } from '@/mocks/demoSessions';
import type {
  AIExplanationBlocks,
  MedicationReviewRequest,
  MedicationReviewResult,
  OverallSafetyStatus,
  PairComparisonItem,
  PharmacistHandoffDraft,
  ScheduleSlotEntry,
  TechnicalTrace,
} from '@/types/interaction';
import type {
  DrugCatalogItem,
  ExtractMedicationsResponse,
  MedicationInputItem,
  NormalizedCandidate,
  NormalizeMedicationResponse,
  TimeSlot,
} from '@/types/medication';
import { normalizeText, stripDosageTokens } from '@/utils/cn';

const SESSIONS_STORAGE_KEY = 'familymed_review_sessions_v2';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';

export class ApiUnavailableError extends Error {
  constructor(message = 'Không thể kết nối đến máy chủ FamilyMed. Vui lòng thử lại hoặc dùng chế độ dữ liệu mẫu.') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

function levenshteinRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(m, n);
  return (maxLen - dp[m][n]) / maxLen;
}

function buildCandidateFromDrug(
  drug: DrugCatalogItem,
  matchedAlias: string,
  matchType: 'exact' | 'fuzzy',
  score?: number,
): NormalizedCandidate {
  const isGenericMatch = normalizeText(matchedAlias) === normalizeText(drug.genericName);
  const reason =
    matchType === 'exact'
      ? isGenericMatch
        ? 'Khớp trực tiếp tên hoạt chất chuẩn trong danh mục.'
        : `Khớp biệt dược "${matchedAlias}" → ${drug.genericName}.`
      : `Khớp gần đúng (${Math.round((score ?? 0.8) * 100)}%) với "${matchedAlias}" → ${drug.genericName}. Cần đối chiếu vỏ hộp trước khi xác nhận.`;

  return {
    code: drug.code,
    genericName: drug.genericName,
    drugClass: drug.drugClass,
    matchedAlias,
    matchType,
    confidenceLabel: matchType === 'exact' ? 'Khớp trong danh mục' : 'Khớp gần đúng — cần xác nhận',
    reason,
    recommendedSlots: drug.recommendedSlots,
    mealRelation: drug.mealRelation,
    timingNote: drug.timingNote,
  };
}

function localNormalizeMedication(query: string): NormalizeMedicationResponse {
  const cleaned = stripDosageTokens(normalizeText(query));
  if (!cleaned) {
    return {
      query,
      status: 'not_found',
      candidates: [],
      catalogVersion: CATALOG_METADATA.version,
      isMockData: true,
    };
  }

  const exactCandidates: NormalizedCandidate[] = [];
  const seenCodes = new Set<string>();

  for (const drug of DRUG_CATALOG) {
    const terms = [...drug.aliases, drug.genericName];
    for (const term of terms) {
      const normTerm = normalizeText(term);
      if (
        normTerm === cleaned ||
        cleaned.split(' ').includes(normTerm) ||
        (normTerm.length >= 5 && cleaned.includes(normTerm))
      ) {
        if (!seenCodes.has(drug.code)) {
          seenCodes.add(drug.code);
          exactCandidates.push(buildCandidateFromDrug(drug, term, 'exact'));
        }
        break;
      }
    }
  }

  if (exactCandidates.length > 0) {
    return {
      query,
      status: 'matched',
      candidates: exactCandidates,
      catalogVersion: CATALOG_METADATA.version,
      isMockData: true,
    };
  }

  const fuzzyScored: Array<{ candidate: NormalizedCandidate; score: number }> = [];
  const tokens = cleaned.split(' ').filter((t) => t.length >= 4);
  const probes = [cleaned, ...tokens];

  for (const drug of DRUG_CATALOG) {
    const terms = [...drug.aliases, drug.genericName];
    let bestScore = 0;
    let bestTerm = drug.genericName;
    for (const term of terms) {
      const normTerm = normalizeText(term);
      for (const probe of probes) {
        const ratio = levenshteinRatio(probe, normTerm);
        if (ratio > bestScore) {
          bestScore = ratio;
          bestTerm = term;
        }
      }
    }
    if (bestScore >= 0.72) {
      fuzzyScored.push({
        candidate: buildCandidateFromDrug(drug, bestTerm, 'fuzzy', bestScore),
        score: bestScore,
      });
    }
  }

  fuzzyScored.sort((a, b) => b.score - a.score);
  const topFuzzy = fuzzyScored.slice(0, 2).map((item) => item.candidate);

  if (topFuzzy.length > 0) {
    return {
      query,
      status: 'fuzzy',
      candidates: topFuzzy,
      catalogVersion: CATALOG_METADATA.version,
      isMockData: true,
    };
  }

  return {
    query,
    status: 'not_found',
    candidates: [],
    catalogVersion: CATALOG_METADATA.version,
    isMockData: true,
  };
}

const VI_ACCENTED_FILLER_WORDS = new Set([
  'tôi', 'mình', 'em', 'anh', 'chị', 'mẹ', 'bố', 'bà', 'ông', 'cô', 'chú', 'bác',
  'nhà', 'người', 'già', 'cao', 'tuổi', 'đang', 'dùng', 'uống', 'xếp', 'lịch',
  'giúp', 'hộ', 'với', 'cho', 'của', 'các', 'loại', 'thuốc', 'viên', 'ngày',
  'sáng', 'trưa', 'chiều', 'tối', 'đêm', 'trước', 'sau', 'ăn', 'bữa', 'giờ',
  'theo', 'đơn', 'bác', 'sĩ', 'mua', 'thêm', 'cùng', 'chung', 'gồm', 'có',
  'hôm', 'nay', 'mới', 'kê', 'khi', 'đau', 'khớp', 'tim', 'mạch', 'huyết', 'áp',
  'tiểu', 'đường', 'trị', 'gút', 'ngoài', 'phòng', 'khám', 'một', 'khác', 'lúc', 'đói',
  'hãy', 'nhờ', 'xem', 'kiểm', 'tra', 'nhé', 'nha', 'và', 'kèm',
]);

function extractExplicitFrequency(segment: string): string | undefined {
  const norm = normalizeText(segment);
  const hints: string[] = [];
  if (/\bsang\b/.test(norm)) hints.push('sáng');
  if (/\btrua\b/.test(norm)) hints.push('trưa');
  if (/\bchieu\b/.test(norm)) hints.push('chiều');
  if (/\btoi\b/.test(norm)) hints.push('tối');
  if (norm.includes('khi dau')) hints.push('khi đau');
  if (norm.includes('moi ngay') || norm.includes('hang ngay')) hints.push('hằng ngày');
  return hints.length > 0 ? hints.join(', ') : undefined;
}

function extractExplicitMealTiming(segment: string): string | undefined {
  const norm = normalizeText(segment);
  if (norm.includes('luc doi')) return 'lúc đói';
  if (norm.includes('truoc an')) return 'trước ăn';
  if (norm.includes('sau an')) return 'sau ăn';
  return undefined;
}

function extractStrengthToken(segment: string): string {
  const match = segment.match(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu)\b/i);
  return match ? match[0].replace(/\s+/g, '') : '';
}

function stripAccentFillerPrefix(segment: string): string {
  const withoutDosage = stripDosageTokens(segment).replace(/[.,;:!?()[\]]+/g, ' ').trim();
  const originalTokens = withoutDosage.split(/\s+/).filter(Boolean);
  const kept = originalTokens.filter((token) => {
    const lowerToken = token.toLowerCase();
    if (/^\d+$/.test(lowerToken)) return false;
    return !VI_ACCENTED_FILLER_WORDS.has(lowerToken);
  });
  return kept.join(' ').trim();
}

function localExtractFromText(rawText: string): ExtractMedicationsResponse {
  // Split only on delimiters and true conjunctions (do not split inside "uống thêm ...")
  const segments = rawText
    .split(/[,;\n+/]|\s+(?:và|với|cùng|kèm)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: MedicationInputItem[] = [];
  const seenKeys = new Set<string>();

  for (const seg of segments) {
    const strength = extractStrengthToken(seg);
    const freq = extractExplicitFrequency(seg);
    const meal = extractExplicitMealTiming(seg);

    // Try matching catalog aliases directly inside the segment first
    const normSeg = stripDosageTokens(normalizeText(seg));
    let matchedInSeg: NormalizedCandidate | null = null;
    let displayRaw = '';

    for (const drug of DRUG_CATALOG) {
      const terms = [...drug.aliases, drug.genericName].sort((a, b) => b.length - a.length);
      for (const term of terms) {
        const nt = normalizeText(term);
        const re = new RegExp(`(^|\\s)${nt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
        if (re.test(normSeg)) {
          matchedInSeg = buildCandidateFromDrug(drug, term, 'exact');
          // Keep rawName free of duplicated dosage (strength lives cleanly in `strength`)
          displayRaw = term;
          break;
        }
      }
      if (matchedInSeg) break;
    }

    if (matchedInSeg) {
      const key = `${matchedInSeg.code}-${normalizeText(displayRaw)}-${normalizeText(strength)}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const missingInfo: string[] = [];
      if (!strength) missingInfo.push('Chưa nêu hàm lượng');
      if (!meal) missingInfo.push('Chưa nêu thời điểm theo bữa ăn');

      items.push({
        id: `ext-${Date.now().toString(36)}-${items.length}`,
        rawName: displayRaw,
        normalizedName: matchedInSeg.genericName,
        activeIngredient: matchedInSeg.genericName,
        strength,
        dosageForm: 'vien_nen',
        prescriptionNote: [freq, meal].filter(Boolean).join(', '),
        extractedFrequency: freq,
        extractedMealTiming: meal,
        missingInfo,
        // Never auto-confirm from free text: require user review!
        recognitionStatus: 'suggested',
        candidates: [matchedInSeg],
      });
      continue;
    }

    // Preserve Vietnamese diacritics and capitalization for unknown/unmapped medications
    const preservedPhrase = stripAccentFillerPrefix(seg);
    const normCandidate = normalizeText(preservedPhrase);
    if (normCandidate.length >= 4 && (strength || preservedPhrase.split(/\s+/).some((t) => t.length >= 5))) {
      const normRes = localNormalizeMedication(normCandidate);
      const key = `${normCandidate}-${normalizeText(strength)}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      if (normRes.status !== 'not_found' && normRes.candidates.length > 0) {
        const missingInfo: string[] = [];
        if (!strength) missingInfo.push('Chưa nêu hàm lượng');
        if (!meal) missingInfo.push('Chưa nêu thời điểm theo bữa ăn');
        items.push({
          id: `ext-${Date.now().toString(36)}-${items.length}`,
          rawName: preservedPhrase,
          normalizedName: normRes.candidates[0]?.genericName,
          activeIngredient: '',
          strength,
          dosageForm: 'vien_nen',
          prescriptionNote: [freq, meal].filter(Boolean).join(', '),
          extractedFrequency: freq,
          extractedMealTiming: meal,
          missingInfo,
          recognitionStatus: 'suggested',
          candidates: normRes.candidates,
        });
      } else {
        items.push({
          id: `ext-${Date.now().toString(36)}-${items.length}`,
          rawName: preservedPhrase,
          activeIngredient: '',
          strength,
          dosageForm: 'vien_nen',
          prescriptionNote: [freq, meal].filter(Boolean).join(', '),
          extractedFrequency: freq,
          extractedMealTiming: meal,
          missingInfo: ['Chưa có trong danh mục 18 hoạt chất'],
          recognitionStatus: 'not_in_catalog',
          matchReason: 'Chưa tìm thấy thuốc này trong danh mục hỗ trợ hiện tại.',
        });
      }
    }
  }

  return {
    rawText,
    isMockExtraction: true,
    extractionNote:
      'Đã tách danh sách thuốc từ nội dung dán vào — kiểm tra tên, hàm lượng và xác nhận từng thuốc trước khi đối chiếu.',
    items,
  };
}

function detectRedFlags(request: MedicationReviewRequest): { detected: boolean; matchedFlags: string[]; message: string } {
  const combined = [
    request.profile.notes,
    ...request.medications.map((m) => `${m.rawName} ${m.prescriptionNote}`),
  ].join(' ');
  const norm = normalizeText(combined);
  const matchedFlags: string[] = [];

  for (const rule of RED_FLAG_PATTERNS) {
    if (norm.includes(rule.key) && !norm.includes(`khong ${rule.key}`) && !norm.includes(`khong co ${rule.key}`)) {
      if (!matchedFlags.includes(rule.label)) {
        matchedFlags.push(rule.label);
      }
    }
  }

  if (matchedFlags.length > 0) {
    return {
      detected: true,
      matchedFlags,
      message: `Phát hiện dấu hiệu nguy hiểm (${matchedFlags.join('; ')}). Dừng việc tự sắp xếp lịch thuốc và đưa người bệnh đi khám hoặc gọi cấp cứu 115 ngay.`,
    };
  }

  return { detected: false, matchedFlags: [], message: '' };
}

function evaluateLocally(
  request: MedicationReviewRequest,
  options?: { sessionId?: string; createdAt?: string; isDemoSession?: boolean; demoSourceLabel?: string },
): MedicationReviewResult {
  const sessionId = options?.sessionId || `FM-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = options?.createdAt || new Date().toISOString();
  const redFlag = detectRedFlags(request);

  const medications = request.medications;
  const n = medications.length;
  const totalPairsTheoretical = (n * (n - 1)) / 2;

  const catalogByCode = new Map(DRUG_CATALOG.map((d) => [d.code, d]));
  const confirmedMeds = medications.filter(
    (m) => m.recognitionStatus === 'confirmed' && m.matchedDrugCode && catalogByCode.has(m.matchedDrugCode),
  );
  const unknownMeds = medications.filter(
    (m) => !(m.recognitionStatus === 'confirmed' && m.matchedDrugCode && catalogByCode.has(m.matchedDrugCode)),
  );

  // Detect duplicate active ingredients (e.g., two brands of the same generic in catalog)
  const medsByCode = new Map<string, string[]>();
  for (const med of confirmedMeds) {
    const code = med.matchedDrugCode!;
    const arr = medsByCode.get(code) ?? [];
    arr.push(med.rawName);
    medsByCode.set(code, arr);
  }
  const duplicateActiveIngredients = Array.from(medsByCode.entries())
    .filter(([, names]) => names.length > 1)
    .map(([code, rawNames]) => ({
      code,
      genericName: catalogByCode.get(code)!.genericName,
      rawNames,
    }));

  const pairComparisons: PairComparisonItem[] = [];
  let pairsCheckedInCatalog = 0;
  let pairsNotCovered = 0;
  const severityCounts = {
    nang: 0,
    trung_binh: 0,
    nhe: 0,
    noRecord: 0,
    unknown: 0,
  };

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const medA = medications[i];
      const medB = medications[j];
      const drugA = medA.matchedDrugCode ? catalogByCode.get(medA.matchedDrugCode) : undefined;
      const drugB = medB.matchedDrugCode ? catalogByCode.get(medB.matchedDrugCode) : undefined;
      const labelA = drugA ? `${medA.rawName} (${drugA.genericName})` : medA.rawName;
      const labelB = drugB ? `${medB.rawName} (${drugB.genericName})` : medB.rawName;

      if (!drugA || !drugB) {
        pairsNotCovered += 1;
        severityCounts.unknown += 1;
        pairComparisons.push({
          id: `${medA.id}-${medB.id}`,
          drugAName: labelA,
          drugBName: labelB,
          drugACode: drugA?.code,
          drugBCode: drugB?.code,
          severity: 'unknown',
          dataDescription:
            'Ít nhất một thuốc trong cặp này chưa có trong danh mục 18 hoạt chất hiện tại.',
          plainExplanation:
            'Hệ thống không suy đoán tương tác ngoài dữ liệu. Cần trao đổi với dược sĩ hoặc bác sĩ để kiểm tra cặp thuốc này.',
          verificationStatus: !drugA && !drugB ? 'unknown_medication' : 'not_covered',
          sourceInfo: 'Ngoài phạm vi dữ liệu hiện có (18 hoạt chất mẫu)',
        });
        continue;
      }

      pairsCheckedInCatalog += 1;
      const normA = normalizeText(drugA.genericName);
      const normB = normalizeText(drugB.genericName);

      const hit = INTERACTIONS_CATALOG.find((inter) => {
        const ia = normalizeText(inter.drugA);
        const ib = normalizeText(inter.drugB);
        return (ia === normA && ib === normB) || (ia === normB && ib === normA);
      });

      if (hit) {
        severityCounts[hit.severity] += 1;
        pairComparisons.push({
          id: `${medA.id}-${medB.id}`,
          drugAName: labelA,
          drugBName: labelB,
          drugACode: drugA.code,
          drugBCode: drugB.code,
          interactionCode: hit.code,
          severity: hit.severity,
          action: hit.action,
          dataDescription: hit.summary,
          plainExplanation: hit.recommendation,
          verificationStatus: 'interaction_found',
          sourceInfo: `${hit.code} · ${hit.publicSource}`,
        });
      } else {
        severityCounts.noRecord += 1;
        pairComparisons.push({
          id: `${medA.id}-${medB.id}`,
          drugAName: labelA,
          drugBName: labelB,
          drugACode: drugA.code,
          drugBCode: drugB.code,
          severity: 'no_record',
          dataDescription:
            'Không tìm thấy bản ghi tương tác giữa hai hoạt chất này trong 12 cặp mẫu của dữ liệu.',
          plainExplanation:
            'Hệ thống chưa tìm thấy cảnh báo trong phạm vi dữ liệu hiện có. Điều này không chứng minh rằng các thuốc không có tương tác.',
          verificationStatus: 'no_interaction_record',
          sourceInfo: `Đối chiếu trên bảng 12 cặp tương tác mẫu (${CATALOG_METADATA.version})`,
        });
      }
    }
  }

  const severityRank: Record<string, number> = {
    nang: 0,
    trung_binh: 1,
    unknown: 2,
    nhe: 3,
    no_record: 4,
  };
  pairComparisons.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));

  const severePairs = pairComparisons.filter((p) => p.severity === 'nang');
  const separationPairs = pairComparisons.filter((p) => p.action === 'tach_gio');
  const sepCodes = new Set(separationPairs.map((p) => p.interactionCode).filter(Boolean));
  const separationNotes = separationPairs.map(
    (p) => `${p.drugAName} + ${p.drugBName}: ${p.plainExplanation}`,
  );
  const heldForPharmacist = severePairs.map((p) => ({
    code: p.interactionCode || 'SEVERE',
    pair: `${p.drugAName} + ${p.drugBName}`,
    recommendation: p.plainExplanation,
  }));

  const slots: Record<TimeSlot, ScheduleSlotEntry[]> = {
    sang: [],
    trua: [],
    toi: [],
  };

  let scheduleAllowed = true;
  let blockedReason: string | undefined;

  if (redFlag.detected) {
    scheduleAllowed = false;
    blockedReason =
      'Phát hiện dấu hiệu cảnh báo cấp cứu trong ghi chú. Lịch thuốc bị khóa hoàn toàn để ưu tiên đi khám hoặc gọi 115.';
  } else if (severePairs.length > 0) {
    scheduleAllowed = false;
    blockedReason = `Phát hiện ${severePairs.length} cặp tương tác mức nghiêm trọng (${severePairs
      .map((s) => `${s.drugAName} + ${s.drugBName}`)
      .join(' · ')}). Theo quy tắc an toàn, hệ thống tạm khóa lịch uống hoàn chỉnh cho tới khi có xác nhận từ dược sĩ hoặc bác sĩ.`;
  } else if (confirmedMeds.length === 0) {
    scheduleAllowed = false;
    blockedReason =
      'Chưa có thuốc nào nằm trong danh mục hỗ trợ hiện tại nên hệ thống không thể sắp xếp khung giờ uống nháp.';
  } else {
    const mealOrder = { truoc_an: 0, bat_ky: 1, sau_an: 2 };
    const seenDrugCodes = new Set<string>();

    for (const med of confirmedMeds) {
      const catalogItem = catalogByCode.get(med.matchedDrugCode!)!;
      if (seenDrugCodes.has(catalogItem.code)) continue;
      seenDrugCodes.add(catalogItem.code);

      let targetSlots = [...catalogItem.recommendedSlots];
      let timingNote = catalogItem.timingNote;
      let separatedByRule: string | undefined;

      if (sepCodes.has('INT-09') && catalogItem.code === 'DRUG-16') {
        targetSlots = ['trua'];
        timingNote = 'Tạm chuyển sang sau bữa trưa để tách ít nhất 4 giờ khỏi Levothyroxine.';
        separatedByRule = 'Tách giờ ≥ 4 giờ';
      }
      if (sepCodes.has('INT-10') && catalogItem.code === 'DRUG-14') {
        targetSlots = ['toi'];
        timingNote = 'Tạm chuyển sang trước bữa tối 30 phút để tránh uống gần Levothyroxine sáng sớm.';
        separatedByRule = 'Tách giờ khỏi Levothyroxine';
      }

      const entry: ScheduleSlotEntry = {
        code: catalogItem.code,
        genericName: catalogItem.genericName,
        displayName:
          normalizeText(med.rawName) === normalizeText(catalogItem.genericName)
            ? catalogItem.genericName
            : `${med.rawName} (${catalogItem.genericName})`,
        mealRelation: catalogItem.mealRelation,
        mealLabel: MEAL_LABELS[catalogItem.mealRelation],
        timingNote,
        prescriptionNote: med.prescriptionNote || undefined,
        separatedByRule,
        status: 'nhap_cho_nguoi_xac_nhan',
      };

      for (const sl of targetSlots) {
        slots[sl].push(entry);
      }
    }

    (['sang', 'trua', 'toi'] as TimeSlot[]).forEach((sl) => {
      slots[sl].sort((a, b) => {
        const mealDiff = mealOrder[a.mealRelation] - mealOrder[b.mealRelation];
        return mealDiff !== 0 ? mealDiff : a.code.localeCompare(b.code);
      });
    });
  }

  const missingStrengthCount = medications.filter((m) => !m.strength.trim()).length;
  const missingNotesCount = medications.filter((m) => !m.prescriptionNote.trim()).length;
  const hasMissingStrengthOrNote = missingStrengthCount > 0;
  const overallStatus: OverallSafetyStatus =
    redFlag.detected || severityCounts.nang > 0
      ? 'red'
      : unknownMeds.length > 0 || severityCounts.trung_binh > 0 || duplicateActiveIngredients.length > 0 || hasMissingStrengthOrNote
        ? 'amber'
        : 'green';

  const statusHeadline = redFlag.detected
    ? 'Phát hiện dấu hiệu khẩn cấp — ưu tiên đi khám hoặc gọi 115 ngay.'
    : severityCounts.nang > 0
      ? 'Phát hiện tương tác nghiêm trọng — lịch thuốc hoàn chỉnh đã bị khóa.'
      : unknownMeds.length > 0 || pairsNotCovered > 0
        ? 'Có thuốc ngoài danh mục hoặc cặp chưa có dữ liệu đối chiếu.'
        : duplicateActiveIngredients.length > 0 && severityCounts.trung_binh > 0
          ? 'Phát hiện trùng hoạt chất và tương tác mức trung bình cần lưu ý.'
          : duplicateActiveIngredients.length > 0
            ? 'Phát hiện hai thuốc có thể trùng hoạt chất cần kiểm tra lại.'
            : severityCounts.trung_binh > 0
              ? 'Đã đối chiếu đủ danh mục — có tương tác mức trung bình cần lưu ý.'
              : missingStrengthCount > 0
                ? 'Đã đối chiếu danh mục thuốc — còn thiếu hàm lượng để hoàn thiện thông tin.'
                : 'Đã hoàn tất đối chiếu trong phạm vi dữ liệu hiện có.';

  const coverageSummary =
    confirmedMeds.length === n && pairsNotCovered === 0
      ? `${n}/${n} thuốc thuộc danh mục hỗ trợ · ${pairsCheckedInCatalog}/${totalPairsTheoretical} cặp có dữ liệu đối chiếu`
      : `${confirmedMeds.length}/${n} thuốc thuộc danh mục · ${unknownMeds.length} thuốc ngoài danh mục · ${pairsNotCovered} cặp chưa có dữ liệu`;

  const missingInfoParts: string[] = [];
  if (missingStrengthCount > 0) missingInfoParts.push(`Chưa ghi hàm lượng cho ${missingStrengthCount} thuốc`);
  if (missingNotesCount > 0) missingInfoParts.push(`Chưa có hướng dẫn theo đơn cho ${missingNotesCount} thuốc`);
  const missingInfoSummary =
    missingInfoParts.length > 0 ? missingInfoParts.join(' · ') : 'Đủ hàm lượng và hướng dẫn theo đơn';

  const safetySummaryBanner = statusHeadline;

  const aiExplanation = buildAiExplanation({
    totalMeds: n,
    confirmedCount: confirmedMeds.length,
    unknownMeds,
    totalPairsTheoretical,
    pairsCheckedInCatalog,
    severityCounts,
    separationPairs,
    scheduleAllowed,
    missingStrengthCount,
  });

  const handoffDraft = buildPharmacistHandoff({
    sessionId,
    profile: request.profile,
    medications,
    catalogByCode,
    pairComparisons,
    unknownMeds,
    severityCounts,
  });

  const triggeredRules: string[] = [];
  if (redFlag.detected) triggeredRules.push('GATE-RED-FLAG');
  if (severePairs.length > 0) triggeredRules.push('GATE-BLOCK-SEVERE');
  for (const p of pairComparisons) {
    if (p.interactionCode) triggeredRules.push(p.interactionCode);
  }
  if (unknownMeds.length > 0) triggeredRules.push('RULE-UNKNOWN-BOUNDARY');
  if (duplicateActiveIngredients.length > 0) triggeredRules.push('RULE-DUPLICATE-ACTIVE');

  const severityMax: TechnicalTrace['structuredOutput']['severity_max'] =
    severityCounts.nang > 0
      ? 'nang'
      : severityCounts.trung_binh > 0
        ? 'trung_binh'
        : severityCounts.nhe > 0
          ? 'nhe'
          : 'khong';

  const requiresPharmacist =
    redFlag.detected ||
    severityCounts.nang > 0 ||
    unknownMeds.length > 0 ||
    pairComparisons.some((p) => p.action === 'hoi_duoc_si');

  const technicalTrace: TechnicalTrace = {
    steps: [
      {
        workflow: 'Medication Normalization',
        component: 'Mock Extraction & Catalog Match',
        status: 'mocked',
        summary: `Nhận diện ${confirmedMeds.length}/${n} thuốc vào danh mục 18 hoạt chất; ${unknownMeds.length} thuốc chưa có trong danh mục.`,
      },
      {
        workflow: 'Interaction Lookup',
        component: 'Code / Database (drugs.json + interactions.json)',
        status: 'completed',
        summary: `Tra cứu ${pairsCheckedInCatalog}/${totalPairsTheoretical} cặp trên bảng 12 cặp tương tác mẫu.`,
      },
      {
        workflow: 'Safety Gate',
        component: 'Rule Engine',
        status: scheduleAllowed ? 'completed' : 'blocked',
        summary: scheduleAllowed
          ? 'Không phát hiện điều kiện chặn lịch nghiêm trọng; cho phép tạo lịch nháp.'
          : 'Kích hoạt cổng chặn an toàn: khóa lịch uống hoàn chỉnh và yêu cầu hỏi dược sĩ.',
      },
      {
        workflow: 'AI Explanation',
        component: 'Mock Response (chưa nối LLM thật)',
        status: 'mocked',
        summary: 'Tổng hợp 4 nhóm giải thích từ kết quả công cụ và giới hạn dữ liệu.',
      },
    ],
    structuredOutput: {
      recognized_medications: confirmedMeds.map((m) => `${m.matchedDrugCode}: ${m.matchedGenericName}`),
      checked_pairs: pairsCheckedInCatalog,
      unresolved_medications: unknownMeds.map((m) => m.rawName),
      severity_max: severityMax,
      allow_schedule: scheduleAllowed,
      has_unmapped: unknownMeds.length > 0,
      requires_pharmacist: requiresPharmacist,
      triggered_rules: triggeredRules,
    },
    telemetry: null, // Chưa có telemetry thật từ backend API
  };

  return {
    sessionId,
    createdAt,
    sourceMode: 'mock_local_engine',
    isDemoSession: options?.isDemoSession,
    demoSourceLabel: options?.demoSourceLabel,
    profile: request.profile,
    medications,
    redFlag,
    overview: {
      overallStatus,
      statusHeadline,
      coverageSummary,
      missingInfoSummary,
      totalMedications: n,
      confirmedInCatalog: confirmedMeds.length,
      unknownMedicationsCount: unknownMeds.length,
      missingStrengthCount,
      missingNotesCount,
      duplicateActiveIngredients,
      totalPairsTheoretical,
      pairsCheckedInCatalog,
      pairsNotCovered,
      severityCounts,
    },
    pairComparisons,
    aiExplanation,
    scheduleDraft: {
      allowed: scheduleAllowed,
      blockedReason,
      slots,
      separationNotes,
      heldForPharmacist,
      disclaimer:
        'Lịch này chỉ là bản nháp hỗ trợ sắp xếp thông tin. Hãy đối chiếu với đơn thuốc và nhãn thuốc thực tế.',
    },
    handoffDraft,
    safetySummaryBanner,
    technicalTrace,
  };
}

function buildAiExplanation(params: {
  totalMeds: number;
  confirmedCount: number;
  unknownMeds: MedicationInputItem[];
  totalPairsTheoretical: number;
  pairsCheckedInCatalog: number;
  severityCounts: { nang: number; trung_binh: number; nhe: number; noRecord: number; unknown: number };
  separationPairs: PairComparisonItem[];
  scheduleAllowed: boolean;
  missingStrengthCount: number;
}): AIExplanationBlocks {
  const {
    totalMeds,
    confirmedCount,
    unknownMeds,
    totalPairsTheoretical,
    pairsCheckedInCatalog,
    severityCounts,
    separationPairs,
    scheduleAllowed,
    missingStrengthCount,
  } = params;

  const whatSystemChecked = `Đối chiếu ${totalMeds} thuốc nhập vào (${confirmedCount} thuốc khớp 18 hoạt chất hỗ trợ, ${unknownMeds.length} thuốc ngoài danh mục) và kiểm tra ${pairsCheckedInCatalog}/${totalPairsTheoretical} cặp trên bảng 12 cặp tương tác mẫu.`;

  const findings: string[] = [];
  if (severityCounts.nang > 0) findings.push(`${severityCounts.nang} cặp mức nghiêm trọng`);
  if (severityCounts.trung_binh > 0) findings.push(`${severityCounts.trung_binh} cặp mức trung bình`);
  if (severityCounts.nhe > 0) findings.push(`${severityCounts.nhe} cặp mức nhẹ`);

  const whatWasFound =
    findings.length > 0
      ? `Ghi nhận ${findings.join(', ')}${
          separationPairs.length > 0 ? ` (${separationPairs.length} cặp cần tách giờ ≥ 4 giờ)` : ''
        }.`
      : 'Chưa ghi nhận bản ghi cảnh báo nào giữa các thuốc đã xác nhận trong bảng 12 cặp mẫu.';

  const dataLimitations = `Dữ liệu đối chiếu mẫu (${CATALOG_METADATA.version}) hiện phủ 18 hoạt chất và 12 cặp phổ biến, chưa xét hàm lượng cụ thể hay chức năng gan/thận.${
    unknownMeds.length > 0
      ? ` ${unknownMeds.map((u) => u.rawName).join(', ')} chưa có trong danh mục nên chưa thể kiểm tra.`
      : ''
  }`;

  const whatToDoNext = !scheduleAllowed
    ? 'Không tự xếp giờ uống hoặc tự ngừng thuốc. Mở "Hỏi dược sĩ" để sao chép tóm tắt mang trao đổi trực tiếp với dược sĩ hoặc bác sĩ.'
    : unknownMeds.length > 0
      ? 'Đối chiếu lịch nháp với đơn thuốc thực tế và dùng mục "Hỏi dược sĩ" để xác nhận thêm thuốc ngoài danh mục.'
      : severityCounts.trung_binh > 0
        ? 'Tuân thủ giãn cách giờ uống ở các cặp mức trung bình, đồng thời kiểm tra lại hàm lượng và đơn thuốc thực tế.'
        : missingStrengthCount > 0
          ? 'Bổ sung hàm lượng trên vỏ hộp thuốc và đối chiếu với đơn thuốc thực tế trước khi áp dụng.'
          : 'Đối chiếu lịch nháp với vỏ hộp và đơn thuốc thực tế của người thân trước khi áp dụng.';

  return {
    isAiInterpretation: true,
    isMockResponse: true,
    whatSystemChecked,
    whatWasFound,
    dataLimitations,
    whatToDoNext,
  };
}

const SEVERITY_TEXT_VI: Record<'nang' | 'trung_binh' | 'nhe', string> = {
  nang: 'Mức nghiêm trọng',
  trung_binh: 'Mức trung bình',
  nhe: 'Mức nhẹ',
};

function buildPharmacistHandoff(params: {
  sessionId: string;
  profile: MedicationReviewRequest['profile'];
  medications: MedicationInputItem[];
  catalogByCode: Map<string, DrugCatalogItem>;
  pairComparisons: PairComparisonItem[];
  unknownMeds: MedicationInputItem[];
  severityCounts: { nang: number; trung_binh: number; nhe: number; noRecord: number; unknown: number };
}): PharmacistHandoffDraft {
  const { sessionId, profile, medications, catalogByCode, pairComparisons, unknownMeds, severityCounts } = params;

  const baseName = profile.displayName.trim() || 'Người thân';
  const hasAgeInName = /\btuổi\b/i.test(baseName);
  const personDisplay = profile.ageGroup && !hasAgeInName ? `${baseName} (${profile.ageGroup})` : baseName;

  const foundWarnings = pairComparisons
    .filter((p) => p.severity === 'nang' || p.severity === 'trung_binh' || p.severity === 'nhe')
    .map((p) => ({
      code: p.interactionCode || 'WARN',
      pair: `${p.drugAName} + ${p.drugBName}`,
      severity: p.severity as 'nang' | 'trung_binh' | 'nhe',
      summary: p.dataDescription,
    }));

  const missingStrength = medications.filter((m) => !m.strength.trim()).map((m) => m.rawName);
  const missingNotes = medications.filter((m) => !m.prescriptionNote.trim()).map((m) => m.rawName);
  const missingInformation: string[] = [];
  if (missingStrength.length > 0) {
    missingInformation.push(`Chưa ghi hàm lượng cho: ${missingStrength.join(', ')}.`);
  }
  if (missingNotes.length > 0) {
    missingInformation.push(`Chưa nhập hướng dẫn trên đơn cho: ${missingNotes.join(', ')}.`);
  }
  if (unknownMeds.length > 0) {
    missingInformation.push(`Chưa có dữ liệu đối chiếu cho: ${unknownMeds.map((u) => u.rawName).join(', ')}.`);
  }

  const suggestedQuestions: string[] = [];
  if (severityCounts.nang > 0) {
    const severeNames = foundWarnings
      .filter((w) => w.severity === 'nang')
      .map((w) => w.pair)
      .join('; ');
    suggestedQuestions.push(
      `Các thuốc ghi nhận cảnh báo mức nghiêm trọng (${severeNames}). Nhờ dược sĩ/bác sĩ xác nhận lại đơn này có cần điều chỉnh hoặc theo dõi đặc biệt không?`,
    );
  }
  if (severityCounts.trung_binh > 0) {
    suggestedQuestions.push(
      'Với các cặp cần lưu ý mức trung bình (kiểm tra hàm lượng hoặc tách giờ uống), gia đình cần chia khung giờ thế nào cho phù hợp?',
    );
  }
  if (unknownMeds.length > 0) {
    suggestedQuestions.push(
      `Thuốc "${unknownMeds.map((u) => u.rawName).join(', ')}" chưa có trong danh mục kiểm tra. Thuốc này có tương tác với các thuốc còn lại trong đơn không?`,
    );
  }
  if (suggestedQuestions.length < 2) {
    suggestedQuestions.push(
      'Nhờ dược sĩ xác nhận lại thời điểm uống trước ăn hoặc sau ăn phù hợp với thói quen sinh hoạt của người thân.',
    );
  }

  const medLines = medications.map((m) => {
    const cat = m.matchedDrugCode ? catalogByCode.get(m.matchedDrugCode) : undefined;
    const strengthPart = m.strength.trim() ? ` ${m.strength.trim()}` : ' (chưa rõ hàm lượng)';
    const catPart = cat ? `(Hoạt chất: ${cat.genericName})` : '(Chưa có trong danh mục hỗ trợ)';
    const notePart = m.prescriptionNote.trim() ? ` — Theo đơn: ${m.prescriptionNote.trim()}` : '';
    return `- ${m.rawName}${strengthPart} ${catPart}${notePart}`;
  });

  const plainTextSummary = [
    'PHIẾU CHUẨN BỊ HỎI DƯỢC SĨ (Bản nháp để tự sao chép)',
    `Người dùng thuốc: ${personDisplay}`,
    ...(profile.notes.trim() ? [`Ghi chú: ${profile.notes.trim()}`] : []),
    '',
    '1. Danh sách thuốc đang kiểm tra:',
    ...medLines,
    '',
    '2. Cảnh báo từ dữ liệu đối chiếu:',
    ...(foundWarnings.length > 0
      ? foundWarnings.map((w) => `- ${w.pair} (${SEVERITY_TEXT_VI[w.severity]}): ${w.summary}`)
      : ['- Chưa ghi nhận cảnh báo trong phạm vi 12 cặp dữ liệu mẫu.']),
    '',
    '3. Thuốc chưa xác định & thông tin cần bổ sung:',
    ...(missingInformation.length > 0 ? missingInformation.map((i) => `- ${i}`) : ['- Không có.']),
    '',
    '4. Câu hỏi gợi ý trao đổi với dược sĩ:',
    ...suggestedQuestions.slice(0, 3).map((q, idx) => `${idx + 1}. ${q}`),
    '',
    'Lưu ý: Bản nháp này không thay thế đơn thuốc hoặc tư vấn chuyên môn của bác sĩ, dược sĩ.',
  ].join('\n');

  const priority =
    severityCounts.nang > 0 ? 'KHAN_CAP_TRONG_NGAY' : severityCounts.trung_binh > 0 || unknownMeds.length > 0 ? 'UU_TIEN' : 'THUONG_QUY';

  return {
    draftId: `DS-DRAFT-${sessionId}`,
    sent: false,
    statusLabel: 'Bản nháp – chưa gửi',
    priority,
    medications: medications.map((m) => {
      const cat = m.matchedDrugCode ? catalogByCode.get(m.matchedDrugCode) : undefined;
      return {
        displayName: m.rawName,
        genericName: cat?.genericName,
        code: cat?.code,
        strength: m.strength || undefined,
        inCatalog: Boolean(cat),
      };
    }),
    foundWarnings,
    unknownMedications: unknownMeds.map((u) => u.rawName),
    missingInformation,
    suggestedQuestions: suggestedQuestions.slice(0, 3),
    plainTextSummary,
  };
}

function buildInitialDemoSessions(): MedicationReviewResult[] {
  return PRESET_SCENARIOS.slice(0, 3).map((preset, index) => {
    const meds: MedicationInputItem[] = preset.medications.map((m, mIdx) => ({
      ...m,
      id: `${preset.id}-med-${mIdx}`,
    }));
    const demoDate = new Date(Date.now() - (index + 1) * 3600 * 1000).toISOString();
    return evaluateLocally(
      { profile: preset.profile, medications: meds },
      {
        sessionId: `DEMO-${preset.id.replace('preset-', '').toUpperCase()}`,
        createdAt: demoDate,
        isDemoSession: true,
        demoSourceLabel: `Dữ liệu mẫu (${preset.benchmarkRef})`,
      },
    );
  });
}

function readStoredSessions(): MedicationReviewResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MedicationReviewResult[]) : [];
  } catch {
    return [];
  }
}

function writeStoredSessions(sessions: MedicationReviewResult[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export const medicationService = {
  getCatalog(): DrugCatalogItem[] {
    return DRUG_CATALOG;
  },

  async extractMedicationsFromText(rawText: string): Promise<ExtractMedicationsResponse> {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/medications/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText }),
        });
        if (!res.ok) throw new ApiUnavailableError();
        return (await res.json()) as ExtractMedicationsResponse;
      } catch {
        throw new ApiUnavailableError();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 320));
    return localExtractFromText(rawText);
  },

  async normalizeMedication(query: string): Promise<NormalizeMedicationResponse> {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/medications/normalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new ApiUnavailableError();
        return (await res.json()) as NormalizeMedicationResponse;
      } catch {
        throw new ApiUnavailableError();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 240));
    return localNormalizeMedication(query);
  },

  async reviewMedications(request: MedicationReviewRequest): Promise<MedicationReviewResult> {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/medications/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!res.ok) throw new ApiUnavailableError();
        const data = (await res.json()) as MedicationReviewResult;
        const existing = readStoredSessions();
        writeStoredSessions([data, ...existing.filter((s) => s.sessionId !== data.sessionId)]);
        return data;
      } catch {
        throw new ApiUnavailableError();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 360));
    const result = evaluateLocally(request);
    const existing = readStoredSessions();
    writeStoredSessions([result, ...existing.filter((s) => s.sessionId !== result.sessionId)]);
    return result;
  },

  async getReviewResult(sessionId: string): Promise<MedicationReviewResult | null> {
    const stored = readStoredSessions();
    const hit = stored.find((s) => s.sessionId === sessionId);
    if (hit) return hit;

    const demos = buildInitialDemoSessions();
    const demoHit = demos.find((s) => s.sessionId === sessionId);
    if (demoHit) return demoHit;

    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/medications/results/${encodeURIComponent(sessionId)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new ApiUnavailableError();
        return (await res.json()) as MedicationReviewResult;
      } catch {
        throw new ApiUnavailableError();
      }
    }

    return null;
  },

  listSessions(): { userSessions: MedicationReviewResult[]; demoSessions: MedicationReviewResult[] } {
    return {
      userSessions: readStoredSessions(),
      demoSessions: buildInitialDemoSessions(),
    };
  },

  getLatestScheduleEligibleSession(): MedicationReviewResult | null {
    const { userSessions, demoSessions } = this.listSessions();
    const fromUser = userSessions.find((s) => s.scheduleDraft.allowed);
    if (fromUser) return fromUser;
    return demoSessions.find((s) => s.scheduleDraft.allowed) ?? null;
  },
};
