import type { MedicationInputItem, RelativeProfile } from '@/types/medication';

export type PresetIconKey = 'schedule' | 'severe' | 'duplicate' | 'unknown';

export interface PresetScenario {
  id: string;
  title: string;
  badge: string;
  description: string;
  benchmarkRef: string;
  iconKey: PresetIconKey;
  quickPasteSample: string;
  profile: RelativeProfile;
  medications: Array<Omit<MedicationInputItem, 'id'>>;
}

/**
 * 4 tình huống mẫu đối chiếu trực tiếp từ data/drugs.json, data/interactions.json và eval/benchmark.csv.
 * - B04: Levothyroxine + Calcium D3 tách giờ >= 4h (INT-09)
 * - B09: Coversyl + Aldactone tương tác nặng (INT-06)
 * - DRUG-18 (Thử nghiệm): Hai biệt dược Panadol & Efferalgan đều quy về cùng hoạt chất Paracetamol trong drugs.json
 * - B05: Allopurinol ngoài danh mục 18 hoạt chất
 */
export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'preset-b04',
    title: 'Đối chiếu thời điểm',
    badge: 'B04 · Tách giờ',
    description: 'Tách Levothyrox và Canxi D3 cách ≥ 4 giờ',
    benchmarkRef: 'B04',
    iconKey: 'schedule',
    quickPasteSample:
      'Mẹ uống Levothyrox 50mcg buổi sáng lúc đói với viên Canxi D3 500mg, thêm Glucophage 500mg sáng tối sau ăn.',
    profile: {
      displayName: 'Mẹ (66 tuổi)',
      ageGroup: '60–75 tuổi',
      notes: 'Uống thuốc tuyến giáp sáng sớm, hay uống kèm canxi.',
    },
    medications: [
      {
        rawName: 'Levothyrox',
        activeIngredient: 'Levothyroxine',
        strength: '50mcg',
        dosageForm: 'vien_nen',
        prescriptionNote: '1 viên mỗi sáng',
        extractedFrequency: 'mỗi sáng',
        extractedMealTiming: 'lúc đói',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-15',
        matchedGenericName: 'Levothyroxine',
        matchedDrugClass: 'Hormone tuyến giáp',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Levothyrox → Levothyroxine [DRUG-15]',
      },
      {
        rawName: 'Canxi D3',
        activeIngredient: 'Calcium + Vitamin D3',
        strength: '500mg',
        dosageForm: 'vien_nen',
        prescriptionNote: '1 viên/ngày',
        extractedFrequency: '1 viên/ngày',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-16',
        matchedGenericName: 'Calcium + Vitamin D3',
        matchedDrugClass: 'Khoáng chất / bổ sung xương khớp',
        matchType: 'exact',
        matchReason: 'Khớp danh mục: Canxi D3 → Calcium + Vitamin D3 [DRUG-16]',
      },
      {
        rawName: 'Glucophage',
        activeIngredient: 'Metformin',
        strength: '500mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Sáng 1 viên, tối 1 viên sau ăn',
        extractedFrequency: 'sáng tối',
        extractedMealTiming: 'sau ăn',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-01',
        matchedGenericName: 'Metformin',
        matchedDrugClass: 'Thuốc trị đái tháo đường (Biguanide)',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Glucophage → Metformin [DRUG-01]',
      },
    ],
  },
  {
    id: 'preset-b09',
    title: 'Tương tác nghiêm trọng',
    badge: 'B09 · Khóa lịch',
    description: 'Coversyl + Aldactone kích hoạt chặn lịch',
    benchmarkRef: 'B09',
    iconKey: 'severe',
    quickPasteSample:
      'Mẹ 68 tuổi sáng uống Coversyl 5mg với Aldactone 25mg theo đơn tim mạch, trưa khi đau khớp thêm Brufen 400mg sau ăn.',
    profile: {
      displayName: 'Mẹ (68 tuổi)',
      ageGroup: '60–75 tuổi',
      notes: 'Đơn tim mạch buổi sáng, đau khớp uống thêm Brufen.',
    },
    medications: [
      {
        rawName: 'Coversyl',
        activeIngredient: 'Perindopril',
        strength: '5mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Sáng 1 viên',
        extractedFrequency: 'sáng',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-04',
        matchedGenericName: 'Perindopril',
        matchedDrugClass: 'Thuốc hạ huyết áp / tim mạch (Ức chế men chuyển - ACEi)',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Coversyl → Perindopril [DRUG-04]',
      },
      {
        rawName: 'Aldactone',
        activeIngredient: 'Spironolactone',
        strength: '25mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Sáng 1 viên',
        extractedFrequency: 'sáng',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-07',
        matchedGenericName: 'Spironolactone',
        matchedDrugClass: 'Thuốc lợi tiểu giữ kali',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Aldactone → Spironolactone [DRUG-07]',
      },
      {
        rawName: 'Brufen',
        activeIngredient: 'Ibuprofen',
        strength: '400mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Uống khi đau khớp',
        extractedFrequency: 'khi đau khớp',
        extractedMealTiming: 'sau ăn',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-17',
        matchedGenericName: 'Ibuprofen',
        matchedDrugClass: 'Thuốc giảm đau, kháng viêm không steroid (NSAID)',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Brufen → Ibuprofen [DRUG-17]',
      },
    ],
  },
  {
    id: 'preset-dup-paracetamol',
    title: 'Trùng hoạt chất',
    badge: 'Thử nghiệm · DRUG-18',
    description: 'Panadol và Efferalgan cùng chứa Paracetamol',
    benchmarkRef: 'DRUG-18',
    iconKey: 'duplicate',
    quickPasteSample:
      'Mẹ đau đầu uống Panadol buổi sáng, chiều sốt uống thêm Efferalgan 500mg, vẫn uống Glucophage sau ăn.',
    profile: {
      displayName: 'Mẹ (65 tuổi)',
      ageGroup: '60–75 tuổi',
      notes: 'Uống thêm thuốc hạ sốt mua ngoài tiệm.',
    },
    medications: [
      {
        rawName: 'Panadol',
        activeIngredient: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Uống sáng khi đau đầu',
        extractedFrequency: 'sáng',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-18',
        matchedGenericName: 'Paracetamol',
        matchedDrugClass: 'Thuốc giảm đau, hạ sốt',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược trong drugs.json: Panadol → Paracetamol [DRUG-18]',
      },
      {
        rawName: 'Efferalgan',
        activeIngredient: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'vien_sui',
        prescriptionNote: 'Uống chiều khi sốt',
        extractedFrequency: 'chiều',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-18',
        matchedGenericName: 'Paracetamol',
        matchedDrugClass: 'Thuốc giảm đau, hạ sốt',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược trong drugs.json: Efferalgan → Paracetamol [DRUG-18]',
      },
      {
        rawName: 'Glucophage',
        activeIngredient: 'Metformin',
        strength: '500mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Sáng tối sau ăn',
        extractedFrequency: 'sáng tối',
        extractedMealTiming: 'sau ăn',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-01',
        matchedGenericName: 'Metformin',
        matchedDrugClass: 'Thuốc trị đái tháo đường (Biguanide)',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Glucophage → Metformin [DRUG-01]',
      },
    ],
  },
  {
    id: 'preset-b05',
    title: 'Thuốc ngoài danh mục',
    badge: 'B05 · Giới hạn dữ liệu',
    description: 'Allopurinol chưa có trong 18 hoạt chất mẫu',
    benchmarkRef: 'B05',
    iconKey: 'unknown',
    quickPasteSample:
      'Bố uống Coumadin buổi tối với Aspirin 81mg sáng sau ăn, hôm nay bác sĩ ngoài cho thêm thuốc trị gút Allopurinol 300mg.',
    profile: {
      displayName: 'Bố (71 tuổi)',
      ageGroup: '60–75 tuổi',
      notes: 'Bác sĩ phòng khám ngoài mới kê thêm thuốc trị gút.',
    },
    medications: [
      {
        rawName: 'Coumadin',
        activeIngredient: 'Warfarin',
        strength: '',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Uống tối theo đơn tim mạch',
        extractedFrequency: 'buổi tối',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-13',
        matchedGenericName: 'Warfarin',
        matchedDrugClass: 'Thuốc chống đông máu',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Coumadin → Warfarin [DRUG-13]',
      },
      {
        rawName: 'Aspirin 81mg',
        activeIngredient: 'Aspirin',
        strength: '81mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Sáng sau ăn',
        extractedFrequency: 'sáng',
        extractedMealTiming: 'sau ăn',
        recognitionStatus: 'confirmed',
        matchedDrugCode: 'DRUG-11',
        matchedGenericName: 'Aspirin',
        matchedDrugClass: 'Thuốc chống kết tập tiểu cầu',
        matchType: 'exact',
        matchReason: 'Khớp biệt dược: Aspirin 81mg → Aspirin [DRUG-11]',
      },
      {
        rawName: 'Allopurinol',
        activeIngredient: '',
        strength: '300mg',
        dosageForm: 'vien_nen',
        prescriptionNote: 'Thuốc trị gút mới kê thêm',
        missingInfo: ['Chưa có trong danh mục 18 hoạt chất'],
        recognitionStatus: 'not_in_catalog',
        matchReason: 'Chưa tìm thấy thuốc này trong danh mục hiện tại (18 hoạt chất).',
      },
    ],
  },
];
