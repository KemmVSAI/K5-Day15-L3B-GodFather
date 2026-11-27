import { describe, expect, it } from 'vitest';
import { buildDraftFromSession, resetMedicationOnNameChange } from '@/hooks/useCheckerDraft';
import { medicationService } from '@/services/medicationService';
import type { MedicationInputItem } from '@/types/medication';

function makeConfirmed(
  rawName: string,
  code: string,
  genericName: string,
  strength = '',
  prescriptionNote = '',
): MedicationInputItem {
  return {
    id: rawName,
    rawName,
    normalizedName: genericName,
    activeIngredient: genericName,
    strength,
    dosageForm: 'vien_nen',
    prescriptionNote,
    recognitionStatus: 'confirmed',
    matchedDrugCode: code,
    matchedGenericName: genericName,
  };
}

describe('medicationService & data consistency safety rules', () => {
  it('normalizes aliases, suggests fuzzy typos without auto-confirm, and marks out-of-catalog drugs', async () => {
    const exact = await medicationService.normalizeMedication('Glucophage 500mg');
    expect(exact.status).toBe('matched');
    expect(exact.candidates[0]?.code).toBe('DRUG-01');
    expect(exact.candidates[0]?.genericName).toBe('Metformin');

    const fuzzy = await medicationService.normalizeMedication('zococ');
    expect(fuzzy.status).toBe('fuzzy');
    expect(fuzzy.candidates[0]?.genericName).toBe('Simvastatin');

    const unknown = await medicationService.normalizeMedication('Allopurinol');
    expect(unknown.status).toBe('not_found');
    expect(unknown.candidates).toHaveLength(0);
  });

  it('resets activeIngredient, strength, and prescriptionNote when editing drug name after prior identification (Brufen -> Paracetamol)', () => {
    const brufen = makeConfirmed('Brufen', 'DRUG-17', 'Ibuprofen', '400mg', 'Uống sau ăn khi đau');
    const updated = resetMedicationOnNameChange(brufen, 'Paracetamol');

    expect(updated.rawName).toBe('Paracetamol');
    expect(updated.activeIngredient).toBe('');
    expect(updated.strength).toBe('');
    expect(updated.prescriptionNote).toBe('');
    expect(updated.matchedDrugCode).toBeUndefined();
    expect(updated.matchedGenericName).toBeUndefined();
    expect(updated.recognitionStatus).toBe('idle');
  });

  it('extracts Coversyl 5mg without duplicating strength and preserves Vietnamese diacritics on unknown medications', async () => {
    const extracted = await medicationService.extractMedicationsFromText(
      'Mẹ sáng uống Coversyl 5mg với Aldactone 25mg, trưa uống thêm thuốc bổ mắt Lutein',
    );
    expect(extracted.isMockExtraction).toBe(true);
    expect(extracted.items.length).toBe(3);

    const coversyl = extracted.items[0]!;
    expect(coversyl.rawName).toBe('Coversyl');
    expect(coversyl.strength).toBe('5mg');
    expect(coversyl.normalizedName).toBe('Perindopril');
    expect(coversyl.recognitionStatus).toBe('suggested');
    expect(coversyl.extractedFrequency).toContain('sáng');

    const aldactone = extracted.items[1]!;
    expect(aldactone.rawName).toBe('Aldactone');
    expect(aldactone.strength).toBe('25mg');
    expect(aldactone.normalizedName).toBe('Spironolactone');

    const lutein = extracted.items[2]!;
    expect(lutein.rawName).toBe('bổ mắt Lutein');
    expect(lutein.rawName).not.toBe('mat lutein');
    expect(lutein.extractedFrequency).toContain('trưa');
    expect(lutein.recognitionStatus).toBe('not_in_catalog');
  });

  it('computes N*(N-1)/2 pairs, blocks severe schedule, formats clean Vietnamese handoff with ageGroup and no enum tokens', async () => {
    const result = await medicationService.reviewMedications({
      profile: { displayName: 'Mẹ', ageGroup: '60–75 tuổi', notes: '' },
      medications: [
        makeConfirmed('Coumadin', 'DRUG-13', 'Warfarin', '2mg', 'Uống tối'),
        makeConfirmed('Aspirin', 'DRUG-11', 'Aspirin', '81mg', 'Sáng sau ăn'),
        {
          id: 'allopurinol',
          rawName: 'Allopurinol',
          activeIngredient: '',
          strength: '300mg',
          dosageForm: 'vien_nen',
          prescriptionNote: '',
          recognitionStatus: 'not_in_catalog',
        },
      ],
    });

    expect(result.overview.overallStatus).toBe('red');
    expect(result.overview.totalMedications).toBe(3);
    expect(result.overview.totalPairsTheoretical).toBe(3);
    expect(result.overview.pairsCheckedInCatalog).toBe(1);
    expect(result.overview.pairsNotCovered).toBe(2);
    expect(result.overview.severityCounts.nang).toBe(1);
    expect(result.scheduleDraft.allowed).toBe(false);
    expect(result.handoffDraft.sent).toBe(false);

    // Pharmacist handoff preserves ageGroup and avoids raw enums / technical codes
    expect(result.handoffDraft.plainTextSummary).toContain('Mẹ (60–75 tuổi)');
    expect(result.handoffDraft.plainTextSummary).toContain('Mức nghiêm trọng');
    expect(result.handoffDraft.plainTextSummary).not.toContain('(nang)');
    expect(result.handoffDraft.plainTextSummary).not.toContain('(trung_binh)');
    expect(result.handoffDraft.plainTextSummary).not.toContain('[INT-');
    expect(result.handoffDraft.plainTextSummary).not.toContain('[DRUG-');

    // Technical trace remains accurate
    expect(result.technicalTrace.structuredOutput.severity_max).toBe('nang');
    expect(result.technicalTrace.structuredOutput.allow_schedule).toBe(false);
    expect(result.technicalTrace.structuredOutput.has_unmapped).toBe(true);
    expect(result.technicalTrace.structuredOutput.requires_pharmacist).toBe(true);
    expect(result.technicalTrace.structuredOutput.triggered_rules).toContain('GATE-BLOCK-SEVERE');
    expect(result.technicalTrace.telemetry).toBeNull();
  });

  it('produces accurate amber banner for 3/3 confirmed meds with moderate INT-09 interaction without claiming missing catalog coverage', async () => {
    const result = await medicationService.reviewMedications({
      profile: { displayName: 'Mẹ', ageGroup: '60–75 tuổi', notes: '' },
      medications: [
        makeConfirmed('Levothyrox', 'DRUG-15', 'Levothyroxine', '50mcg', 'Sáng lúc đói'),
        makeConfirmed('Canxi D3', 'DRUG-16', 'Calcium + Vitamin D3', '500mg', '1 viên/ngày'),
        makeConfirmed('Glucophage', 'DRUG-01', 'Metformin', '500mg', 'Sáng tối sau ăn'),
      ],
    });

    expect(result.overview.overallStatus).toBe('amber');
    expect(result.overview.confirmedInCatalog).toBe(3);
    expect(result.overview.pairsNotCovered).toBe(0);
    expect(result.overview.severityCounts.trung_binh).toBe(1);
    expect(result.overview.statusHeadline).toContain('Đã đối chiếu đủ danh mục');
    expect(result.overview.statusHeadline).toContain('tương tác mức trung bình');
    expect(result.overview.statusHeadline).not.toContain('chưa được đối chiếu đầy đủ');
    expect(result.aiExplanation.whatToDoNext).not.toContain('thuốc ngoài danh mục');

    expect(result.scheduleDraft.allowed).toBe(true);
    expect(result.scheduleDraft.slots.sang.some((s) => s.code === 'DRUG-15')).toBe(true);
    expect(result.scheduleDraft.slots.trua.some((s) => s.code === 'DRUG-16')).toBe(true);
    expect(result.scheduleDraft.separationNotes.length).toBeGreaterThan(0);
  });

  it('builds fresh editable draft from an existing session without mutating history', async () => {
    const session = await medicationService.getReviewResult('DEMO-B09');
    expect(session).not.toBeNull();
    const clonedDraft = buildDraftFromSession(session!);
    expect(clonedDraft.activePresetId).toBeNull();
    expect(clonedDraft.medications).toHaveLength(session!.medications.length);
    expect(clonedDraft.medications[0]?.id).not.toBe(session!.medications[0]?.id);
  });

  it('detects duplicate active ingredients across different brand names', async () => {
    const result = await medicationService.reviewMedications({
      profile: { displayName: 'Mẹ', ageGroup: '60–75 tuổi', notes: '' },
      medications: [
        makeConfirmed('Panadol', 'DRUG-18', 'Paracetamol', '500mg'),
        makeConfirmed('Efferalgan', 'DRUG-18', 'Paracetamol', '500mg'),
      ],
    });

    expect(result.overview.duplicateActiveIngredients).toHaveLength(1);
    expect(result.overview.duplicateActiveIngredients[0]?.code).toBe('DRUG-18');
    expect(result.technicalTrace.structuredOutput.triggered_rules).toContain('RULE-DUPLICATE-ACTIVE');
  });
});
