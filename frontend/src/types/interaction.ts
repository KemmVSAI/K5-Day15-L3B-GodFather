import type { MealRelation, MedicationInputItem, RelativeProfile, TimeSlot } from './medication';

export type InteractionSeverity = 'nang' | 'trung_binh' | 'nhe' | 'no_record' | 'unknown';

export type InteractionAction = 'hoi_duoc_si' | 'tach_gio' | 'theo_doi';

export type PairVerificationStatus =
  | 'interaction_found'
  | 'no_interaction_record'
  | 'not_covered'
  | 'unknown_medication';

export type OverallSafetyStatus = 'red' | 'amber' | 'green';

export interface CatalogInteraction {
  code: string;
  drugA: string;
  drugB: string;
  severity: 'nang' | 'trung_binh' | 'nhe';
  action: InteractionAction;
  summary: string;
  recommendation: string;
  publicSource: string;
}

export interface PairComparisonItem {
  id: string;
  drugAName: string;
  drugBName: string;
  drugACode?: string;
  drugBCode?: string;
  interactionCode?: string;
  severity: InteractionSeverity;
  action?: InteractionAction;
  dataDescription: string;
  plainExplanation: string;
  verificationStatus: PairVerificationStatus;
  sourceInfo: string;
}

export interface AIExplanationBlocks {
  isAiInterpretation: true;
  isMockResponse: boolean;
  whatSystemChecked: string;
  whatWasFound: string;
  dataLimitations: string;
  whatToDoNext: string;
}

export interface ScheduleSlotEntry {
  code: string;
  genericName: string;
  displayName: string;
  mealRelation: MealRelation;
  mealLabel: string;
  timingNote: string;
  prescriptionNote?: string;
  separatedByRule?: string;
  status: 'nhap_cho_nguoi_xac_nhan' | 'cho_duoc_si_xac_nhan';
}

export interface ScheduleDraft {
  allowed: boolean;
  blockedReason?: string;
  slots: Record<TimeSlot, ScheduleSlotEntry[]>;
  separationNotes: string[];
  heldForPharmacist: Array<{
    code: string;
    pair: string;
    recommendation: string;
  }>;
  disclaimer: string;
}

export interface PharmacistHandoffDraft {
  draftId: string;
  sent: false;
  statusLabel: string;
  priority: 'KHAN_CAP_TRONG_NGAY' | 'UU_TIEN' | 'THUONG_QUY';
  medications: Array<{
    displayName: string;
    genericName?: string;
    code?: string;
    strength?: string;
    inCatalog: boolean;
  }>;
  foundWarnings: Array<{
    code: string;
    pair: string;
    severity: 'nang' | 'trung_binh' | 'nhe';
    summary: string;
  }>;
  unknownMedications: string[];
  missingInformation: string[];
  suggestedQuestions: string[];
  plainTextSummary: string;
}

export interface RedFlagAlert {
  detected: boolean;
  matchedFlags: string[];
  message: string;
}

export interface ReviewOverview {
  overallStatus: OverallSafetyStatus;
  statusHeadline?: string;
  coverageSummary?: string;
  missingInfoSummary?: string;
  totalMedications: number;
  confirmedInCatalog: number;
  unknownMedicationsCount: number;
  missingStrengthCount?: number;
  missingNotesCount?: number;
  duplicateActiveIngredients: Array<{ code: string; genericName: string; rawNames: string[] }>;
  totalPairsTheoretical: number;
  pairsCheckedInCatalog: number;
  pairsNotCovered: number;
  severityCounts: {
    nang: number;
    trung_binh: number;
    nhe: number;
    noRecord: number;
    unknown: number;
  };
}

export interface ExecutionTraceStep {
  workflow: string;
  component: string;
  status: 'completed' | 'blocked' | 'mocked';
  summary: string;
}

export interface TechnicalTraceTelemetry {
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
}

export interface TechnicalTrace {
  steps: ExecutionTraceStep[];
  structuredOutput: {
    recognized_medications: string[];
    checked_pairs: number;
    unresolved_medications: string[];
    severity_max: 'nang' | 'trung_binh' | 'nhe' | 'khong';
    allow_schedule: boolean;
    has_unmapped: boolean;
    requires_pharmacist: boolean;
    triggered_rules: string[];
  };
  telemetry: TechnicalTraceTelemetry | null;
}

export interface MedicationReviewRequest {
  profile: RelativeProfile;
  medications: MedicationInputItem[];
}

export interface MedicationReviewResult {
  sessionId: string;
  createdAt: string;
  sourceMode: 'mock_local_engine' | 'backend_api';
  isDemoSession?: boolean;
  demoSourceLabel?: string;
  profile: RelativeProfile;
  medications: MedicationInputItem[];
  redFlag: RedFlagAlert;
  overview: ReviewOverview;
  pairComparisons: PairComparisonItem[];
  aiExplanation: AIExplanationBlocks;
  scheduleDraft: ScheduleDraft;
  handoffDraft: PharmacistHandoffDraft;
  safetySummaryBanner: string;
  technicalTrace: TechnicalTrace;
}
