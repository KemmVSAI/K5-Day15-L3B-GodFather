export type MealRelation = 'truoc_an' | 'sau_an' | 'bat_ky';

export type TimeSlot = 'sang' | 'trua' | 'toi';

export type DosageForm = 'vien_nen' | 'vien_nang' | 'vien_sui' | 'dung_dich' | 'khac';

export type RecognitionStatus =
  | 'idle'
  | 'searching'
  | 'suggested'
  | 'confirmed'
  | 'not_in_catalog';

export interface DrugCatalogItem {
  code: string;
  genericName: string;
  aliases: string[];
  drugClass: string;
  recommendedSlots: TimeSlot[];
  mealRelation: MealRelation;
  timingNote: string;
  warnings: string[];
  publicSource: string;
}

export interface NormalizedCandidate {
  code: string;
  genericName: string;
  drugClass: string;
  matchedAlias: string;
  matchType: 'exact' | 'fuzzy';
  confidenceLabel: string;
  reason: string;
  recommendedSlots: TimeSlot[];
  mealRelation: MealRelation;
  timingNote: string;
}

export interface NormalizeMedicationResponse {
  query: string;
  status: 'matched' | 'fuzzy' | 'not_found';
  candidates: NormalizedCandidate[];
  catalogVersion: string;
  isMockData: boolean;
}

export interface MedicationInputItem {
  id: string;
  rawName: string;
  normalizedName?: string;
  activeIngredient: string;
  strength: string;
  dosageForm: DosageForm;
  prescriptionNote: string;
  extractedFrequency?: string;
  extractedMealTiming?: string;
  missingInfo?: string[];
  recognitionStatus: RecognitionStatus;
  matchedDrugCode?: string;
  matchedGenericName?: string;
  matchedDrugClass?: string;
  matchType?: 'exact' | 'fuzzy';
  matchReason?: string;
  candidates?: NormalizedCandidate[];
}

export interface ExtractMedicationsResponse {
  rawText: string;
  isMockExtraction: boolean;
  extractionNote: string;
  items: MedicationInputItem[];
}

export interface RelativeProfile {
  displayName: string;
  ageGroup: string;
  notes: string;
}

export interface CheckerDraftState {
  activePresetId: string | null;
  quickPasteText: string;
  profile: RelativeProfile;
  medications: MedicationInputItem[];
  updatedAt: string;
}
