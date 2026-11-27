import { useCallback, useEffect, useState } from 'react';
import type { MedicationReviewResult } from '@/types/interaction';
import type { CheckerDraftState, MedicationInputItem, RelativeProfile } from '@/types/medication';

const DRAFT_STORAGE_KEY = 'familymed_checker_draft_v2';

export function createEmptyMedication(): MedicationInputItem {
  return {
    id: `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    rawName: '',
    activeIngredient: '',
    strength: '',
    dosageForm: 'vien_nen',
    prescriptionNote: '',
    recognitionStatus: 'idle',
  };
}

/**
 * Reset dependent medication metadata when the user edits the drug name after a prior recognition/selection,
 * preventing old active ingredients, strengths, or prescription notes from carrying over to a different drug.
 */
export function resetMedicationOnNameChange(item: MedicationInputItem, nextRawName: string): MedicationInputItem {
  const hadPriorIdentity =
    item.recognitionStatus !== 'idle' ||
    Boolean(item.matchedDrugCode) ||
    Boolean(item.matchedGenericName) ||
    Boolean(item.normalizedName) ||
    Boolean(item.candidates && item.candidates.length > 0);

  if (!hadPriorIdentity) {
    return {
      ...item,
      rawName: nextRawName,
    };
  }

  return {
    ...item,
    rawName: nextRawName,
    normalizedName: undefined,
    activeIngredient: '',
    strength: '',
    prescriptionNote: '',
    extractedFrequency: undefined,
    extractedMealTiming: undefined,
    missingInfo: undefined,
    recognitionStatus: 'idle',
    matchedDrugCode: undefined,
    matchedGenericName: undefined,
    matchedDrugClass: undefined,
    matchType: undefined,
    matchReason: undefined,
    candidates: undefined,
  };
}

const DEFAULT_DRAFT: CheckerDraftState = {
  activePresetId: null,
  quickPasteText: '',
  profile: {
    displayName: 'Mẹ',
    ageGroup: '60–75 tuổi',
    notes: '',
  },
  medications: [createEmptyMedication()],
  updatedAt: new Date().toISOString(),
};

function loadInitialDraft(): CheckerDraftState {
  if (typeof window === 'undefined') return DEFAULT_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw) as CheckerDraftState;
    if (!parsed || !Array.isArray(parsed.medications) || parsed.medications.length === 0) {
      return DEFAULT_DRAFT;
    }
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function buildDraftFromSession(session: MedicationReviewResult): CheckerDraftState {
  const clonedMeds: MedicationInputItem[] = session.medications.map((m, idx) => ({
    ...m,
    id: `reused-${Date.now().toString(36)}-${idx}`,
    candidates: m.candidates ? m.candidates.map((c) => ({ ...c })) : undefined,
  }));

  return {
    activePresetId: null,
    quickPasteText: '',
    profile: {
      displayName: session.profile.displayName || '',
      ageGroup: session.profile.ageGroup || '',
      notes: session.profile.notes || '',
    },
    medications: clonedMeds.length > 0 ? clonedMeds : [createEmptyMedication()],
    updatedAt: new Date().toISOString(),
  };
}

export function saveReusedSessionAsNewDraft(session: MedicationReviewResult): CheckerDraftState {
  const nextDraft = buildDraftFromSession(session);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    } catch {
      // Ignore storage quota errors
    }
  }
  return nextDraft;
}

export function useCheckerDraft() {
  const [draft, setDraft] = useState<CheckerDraftState>(loadInitialDraft);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage errors cleanly
    }
  }, [draft]);

  const updateProfile = useCallback((patch: Partial<RelativeProfile>) => {
    setDraft((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setQuickPasteText = useCallback((text: string) => {
    setDraft((prev) => ({
      ...prev,
      quickPasteText: text,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const replaceMedications = useCallback((medications: MedicationInputItem[]) => {
    setDraft((prev) => ({
      ...prev,
      activePresetId: null,
      medications: medications.length > 0 ? medications : [createEmptyMedication()],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const restoreSnapshotDraft = useCallback((snapshot: CheckerDraftState) => {
    setDraft({
      ...snapshot,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const addMedication = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      activePresetId: null,
      medications: [...prev.medications, createEmptyMedication()],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateMedication = useCallback((id: string, patch: Partial<MedicationInputItem>) => {
    setDraft((prev) => ({
      ...prev,
      medications: prev.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeMedication = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      activePresetId: null,
      medications: prev.medications.filter((m) => m.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const loadPreset = useCallback(
    (
      presetId: string,
      profile: RelativeProfile,
      medications: Array<Omit<MedicationInputItem, 'id'>>,
      quickPasteText = '',
    ) => {
      setDraft({
        activePresetId: presetId,
        quickPasteText,
        profile,
        medications: medications.map((m, idx) => ({
          ...m,
          id: `preset-${Date.now().toString(36)}-${idx}`,
        })),
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const resetDraft = useCallback(() => {
    setDraft({
      activePresetId: null,
      quickPasteText: '',
      profile: { displayName: 'Mẹ', ageGroup: '60–75 tuổi', notes: '' },
      medications: [createEmptyMedication()],
      updatedAt: new Date().toISOString(),
    });
  }, []);

  return {
    draft,
    updateProfile,
    setQuickPasteText,
    replaceMedications,
    restoreSnapshotDraft,
    addMedication,
    updateMedication,
    removeMedication,
    loadPreset,
    resetDraft,
  };
}
