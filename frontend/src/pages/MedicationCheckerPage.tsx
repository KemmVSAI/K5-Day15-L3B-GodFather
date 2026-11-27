import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { IconAlertTriangle, IconExternalLink, IconHistory, IconRefresh, IconShieldCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import { ErrorPanel, LoadingPanel } from '@/components/common/StateFeedback';
import { PharmacistHandoffModal } from '@/components/handoff/PharmacistHandoffModal';
import { MedicationInputTabs, type InputTabMode } from '@/components/medication/MedicationInputTabs';
import { PresetSelector } from '@/components/medication/PresetSelector';
import { RightWorkspaceSidebar } from '@/components/medication/RightWorkspaceSidebar';
import { ReviewResultView } from '@/components/results/ReviewResultView';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { useCheckerDraft } from '@/hooks/useCheckerDraft';
import type { PresetScenario } from '@/mocks/demoSessions';
import { ApiUnavailableError, medicationService } from '@/services/medicationService';
import type { MedicationReviewResult, PharmacistHandoffDraft } from '@/types/interaction';
import type { MedicationInputItem, NormalizedCandidate, RelativeProfile } from '@/types/medication';

interface FieldErrors {
  itemNameErrors: Record<string, string>;
  itemConfirmationErrors: Record<string, string>;
}

interface ReviewSnapshotState {
  result: MedicationReviewResult;
  isStale: boolean;
}

function buildFallbackHandoffDraft(
  profile: RelativeProfile,
  medications: MedicationInputItem[],
): PharmacistHandoffDraft {
  const baseName = profile.displayName.trim() || 'Người thân';
  const hasAgeInName = /\btuổi\b/i.test(baseName);
  const personDisplay = profile.ageGroup && !hasAgeInName ? `${baseName} (${profile.ageGroup})` : baseName;

  const nonEmpty = medications.filter((m) => m.rawName.trim().length > 0);
  const unknownMeds = nonEmpty
    .filter((m) => m.recognitionStatus !== 'confirmed')
    .map((m) => m.rawName);
  const questions = [
    'Nhờ dược sĩ kiểm tra giúp các thuốc trong danh sách này có tương tác đáng lưu ý khi dùng cho người cao tuổi không?',
    'Các thuốc này nên chia uống trước ăn hay sau ăn vào thời điểm nào trong ngày?',
  ];

  const plainTextSummary = [
    'PHIẾU CHUẨN BỊ HỎI DƯỢC SĨ (Bản nháp để tự sao chép)',
    `Người dùng thuốc: ${personDisplay}`,
    ...(profile.notes.trim() ? [`Ghi chú: ${profile.notes.trim()}`] : []),
    '',
    '1. Danh sách thuốc dự kiến hỏi:',
    ...(nonEmpty.length > 0
      ? nonEmpty.map((m) => {
          const strengthPart = m.strength ? ` ${m.strength}` : '';
          const catPart = m.matchedGenericName ? `(Hoạt chất: ${m.matchedGenericName})` : '(Chưa đối chiếu)';
          return `- ${m.rawName}${strengthPart} ${catPart}`;
        })
      : ['- Chưa nhập thuốc nào.']),
    '',
    '2. Câu hỏi dự kiến trao đổi:',
    ...questions.map((q, idx) => `${idx + 1}. ${q}`),
  ].join('\n');

  return {
    draftId: 'DS-DRAFT-PREVIEW',
    sent: false,
    statusLabel: 'Bản nháp để tự sao chép',
    priority: 'THUONG_QUY',
    medications: nonEmpty.map((m) => ({
      displayName: m.rawName,
      genericName: m.matchedGenericName,
      code: m.matchedDrugCode,
      strength: m.strength || undefined,
      inCatalog: Boolean(m.matchedDrugCode),
    })),
    foundWarnings: [],
    unknownMedications: unknownMeds,
    missingInformation: nonEmpty.length === 0 ? ['Chưa nhập danh sách thuốc.'] : [],
    suggestedQuestions: questions,
    plainTextSummary,
  };
}

export function MedicationCheckerPage() {
  const location = useLocation();
  const { technicalMode } = useTechnicalMode();
  const reusedFromLabel = (location.state as { reusedFromLabel?: string } | null)?.reusedFromLabel;

  const {
    draft,
    updateProfile,
    setQuickPasteText,
    replaceMedications,
    addMedication,
    updateMedication,
    removeMedication,
    loadPreset,
    resetDraft,
  } = useCheckerDraft();

  const [inputTab, setInputTab] = useState<InputTabMode>('manual');
  const [errors, setErrors] = useState<FieldErrors>({
    itemNameErrors: {},
    itemConfirmationErrors: {},
  });
  const [reviewError, setReviewError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reviewSnapshot, setReviewSnapshot] = useState<ReviewSnapshotState | null>(null);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);
  const [undoBackup, setUndoBackup] = useState<MedicationInputItem[] | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const markResultStaleIfPresent = () => {
    setReviewError(undefined);
    setReviewSnapshot((prev) => (prev ? { ...prev, isStale: true } : null));
  };

  const handleSelectPreset = (preset: PresetScenario) => {
    loadPreset(preset.id, preset.profile, preset.medications, preset.quickPasteSample);
    setErrors({ itemNameErrors: {}, itemConfirmationErrors: {} });
    setApiError(null);
    setExtractNotice(null);
    setUndoBackup(null);
    setReviewError(undefined);
    setReviewSnapshot(null);
    toast.success(`Đã nạp tình huống: ${preset.title}`);
  };

  const handleResetAll = () => {
    resetDraft();
    setErrors({ itemNameErrors: {}, itemConfirmationErrors: {} });
    setApiError(null);
    setExtractNotice(null);
    setUndoBackup(null);
    setReviewError(undefined);
    setReviewSnapshot(null);
    toast.info('Đã làm mới danh sách thuốc');
  };

  const handleApplyQuickPaste = (
    mode: 'replace' | 'append',
    items: MedicationInputItem[],
    note: string,
  ) => {
    setUndoBackup(draft.medications);
    if (mode === 'replace') {
      replaceMedications(items);
    } else {
      const existingNonEmpty = draft.medications.filter((m) => m.rawName.trim().length > 0);
      replaceMedications([...existingNonEmpty, ...items]);
    }
    setExtractNotice(note);
    setErrors({ itemNameErrors: {}, itemConfirmationErrors: {} });
    markResultStaleIfPresent();
    toast.success(
      mode === 'append'
        ? `Đã thêm ${items.length} thuốc vào danh sách — vui lòng xác nhận từng thuốc`
        : `Đã cập nhật ${items.length} thuốc — vui lòng xác nhận từng thuốc`,
    );
  };

  const handleUndoQuickPaste = () => {
    if (!undoBackup) return;
    replaceMedications(undoBackup);
    setUndoBackup(null);
    setExtractNotice(null);
    markResultStaleIfPresent();
    toast.info('Đã khôi phục danh sách thuốc trước đó');
  };

  const handleLookup = async (id: string, rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        itemNameErrors: { ...prev.itemNameErrors, [id]: 'Vui lòng nhập tên thuốc trước khi nhận diện.' },
      }));
      return;
    }

    markResultStaleIfPresent();
    setErrors((prev) => {
      const nextName = { ...prev.itemNameErrors };
      delete nextName[id];
      const nextConf = { ...prev.itemConfirmationErrors };
      delete nextConf[id];
      return { itemNameErrors: nextName, itemConfirmationErrors: nextConf };
    });

    updateMedication(id, { recognitionStatus: 'searching' });

    try {
      const res = await medicationService.normalizeMedication(trimmed);
      if (res.status === 'not_found' || res.candidates.length === 0) {
        updateMedication(id, {
          recognitionStatus: 'not_in_catalog',
          candidates: [],
          matchedDrugCode: undefined,
          matchedGenericName: undefined,
          matchedDrugClass: undefined,
          matchReason: 'Chưa tìm thấy thuốc này trong danh mục hỗ trợ hiện tại.',
        });
      } else {
        updateMedication(id, {
          recognitionStatus: 'suggested',
          candidates: res.candidates,
          matchedDrugCode: undefined,
          matchedGenericName: undefined,
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiUnavailableError
          ? err.message
          : 'Không thể đối chiếu tên thuốc lúc này. Vui lòng thử lại.';
      setApiError(msg);
      updateMedication(id, { recognitionStatus: 'idle' });
    }
  };

  const handleConfirmCandidate = (id: string, cand: NormalizedCandidate) => {
    markResultStaleIfPresent();
    updateMedication(id, {
      recognitionStatus: 'confirmed',
      normalizedName: cand.genericName,
      activeIngredient: cand.genericName,
      matchedDrugCode: cand.code,
      matchedGenericName: cand.genericName,
      matchedDrugClass: cand.drugClass,
      matchType: cand.matchType,
      matchReason: cand.reason,
      candidates: [cand],
    });
    setErrors((prev) => {
      const nextConf = { ...prev.itemConfirmationErrors };
      delete nextConf[id];
      return { ...prev, itemConfirmationErrors: nextConf };
    });
    toast.success(`Đã xác nhận ${cand.genericName}`);
  };

  const handleResetRecognition = (id: string) => {
    markResultStaleIfPresent();
    updateMedication(id, {
      recognitionStatus: 'idle',
      normalizedName: undefined,
      matchedDrugCode: undefined,
      matchedGenericName: undefined,
      matchedDrugClass: undefined,
      matchReason: undefined,
    });
  };

  const handleReplaceSingleItem = (id: string, nextItem: MedicationInputItem) => {
    markResultStaleIfPresent();
    updateMedication(id, nextItem);
  };

  const handleSubmitReview = async () => {
    setApiError(null);
    setReviewError(undefined);

    const activeMedications = draft.medications.filter((m) => m.rawName.trim().length > 0);
    if (activeMedications.length === 0) {
      setReviewError('Vui lòng nhập ít nhất 1 loại thuốc trước khi kiểm tra.');
      return;
    }

    const itemNameErrors: Record<string, string> = {};
    const itemConfirmationErrors: Record<string, string> = {};

    for (const med of activeMedications) {
      if (med.recognitionStatus === 'idle' || med.recognitionStatus === 'suggested') {
        itemConfirmationErrors[med.id] =
          med.recognitionStatus === 'idle'
            ? 'Bấm "Nhận diện" rồi xác nhận thuốc này trước khi kiểm tra.'
            : 'Bấm "Xác nhận" hoặc "Đánh dấu ngoài dữ liệu" ở khung trên.';
      }
    }

    if (Object.keys(itemConfirmationErrors).length > 0) {
      setErrors({ itemNameErrors, itemConfirmationErrors });
      const firstUnconfirmed = activeMedications.find((m) => itemConfirmationErrors[m.id]);
      const actionHint =
        firstUnconfirmed?.recognitionStatus === 'suggested'
          ? 'Bấm nút "Xác nhận" ở thuốc đang chờ xác nhận.'
          : 'Bấm nút "Nhận diện" ở thuốc chưa đối chiếu.';
      setReviewError(`Còn thuốc chưa được xác nhận nhận diện. ${actionHint}`);

      if (firstUnconfirmed) {
        document.getElementById(`med-card-${firstUnconfirmed.id}`)?.scrollIntoView?.({
          behavior: 'smooth',
          block: 'center',
        });
        const targetButtonId =
          firstUnconfirmed.recognitionStatus === 'suggested' && firstUnconfirmed.candidates?.length
            ? `med-confirm-${firstUnconfirmed.id}`
            : `med-lookup-${firstUnconfirmed.id}`;
        requestAnimationFrame(() => {
          document.getElementById(targetButtonId)?.focus();
        });
      }
      toast.error(actionHint);
      return;
    }

    setErrors({ itemNameErrors: {}, itemConfirmationErrors: {} });
    setSubmitting(true);

    try {
      const result = await medicationService.reviewMedications({
        profile: draft.profile,
        medications: activeMedications,
      });
      setReviewSnapshot({ result, isStale: false });
      toast.success('Đã hoàn tất đối chiếu danh sách thuốc');
      requestAnimationFrame(() => {
        resultsSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      const msg =
        err instanceof ApiUnavailableError
          ? err.message
          : 'Có lỗi xảy ra khi kiểm tra danh sách thuốc. Vui lòng thử lại.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isStaleResult = Boolean(reviewSnapshot?.isStale);
  const currentValidResult = reviewSnapshot && !reviewSnapshot.isStale ? reviewSnapshot.result : null;

  const sidebarHandoffDraft = useMemo(
    () =>
      currentValidResult?.handoffDraft ??
      buildFallbackHandoffDraft(draft.profile, draft.medications),
    [currentValidResult, draft.profile, draft.medications],
  );

  return (
    <div className="space-y-4">
      {/* Page Introduction */}
      <div className="space-y-2">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-[#0F172A] sm:text-2xl">
            Kiểm tra tương tác và sắp xếp thuốc cho cha mẹ
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Nhập danh sách thuốc để đối chiếu dữ liệu và xác định những trường hợp cần hỏi dược sĩ
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs text-[#475569]">
          <IconShieldCheck size={16} stroke={1.6} className="shrink-0 text-[#475569]" aria-hidden="true" />
          <span>Kết quả chỉ hỗ trợ đối chiếu dữ liệu, không thay thế đơn thuốc hoặc tư vấn của nhân viên y tế</span>
        </div>
      </div>

      {/* Notice if opened via Reuse from History / Results / Schedule */}
      {reusedFromLabel ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2.5 text-xs text-[#0F766E]"
        >
          <div className="flex items-center gap-2">
            <IconHistory size={15} stroke={1.6} aria-hidden="true" />
            <span>
              Đã tạo bản nháp mới từ phiên trước (<strong>{reusedFromLabel}</strong>). Chỉnh sửa nếu cần rồi bấm kiểm tra để xem kết quả mới.
            </span>
          </div>
        </div>
      ) : null}

      {/* Undo Quick Paste Banner */}
      {undoBackup ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs text-[#334155]"
        >
          <span>Danh sách thuốc vừa được cập nhật từ mục Dán nhanh.</span>
          <button
            type="button"
            onClick={handleUndoQuickPaste}
            className="font-medium text-[#0F766E] hover:underline"
          >
            Hoàn tác danh sách trước đó
          </button>
        </div>
      ) : null}

      {/* Compact Demo Presets */}
      <PresetSelector
        activePresetId={draft.activePresetId}
        onSelectPreset={handleSelectPreset}
        onReset={handleResetAll}
      />

      {apiError ? (
        <ErrorPanel title="Không thể kết nối dịch vụ kiểm tra" description={apiError} isOffline />
      ) : null}

      {/* Two-Column Medication Workspace (Left ~60%, Right ~40%) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MedicationInputTabs
            activeTab={inputTab}
            onTabChange={setInputTab}
            quickPasteText={draft.quickPasteText}
            onQuickPasteChange={(t) => {
              markResultStaleIfPresent();
              setQuickPasteText(t);
            }}
            profile={draft.profile}
            onUpdateProfile={(patch) => {
              markResultStaleIfPresent();
              updateProfile(patch);
            }}
            medications={draft.medications}
            nameErrors={errors.itemNameErrors}
            confirmationErrors={errors.itemConfirmationErrors}
            submittingReview={submitting}
            isStaleResult={isStaleResult}
            extractNotice={extractNotice}
            onDismissExtractNotice={() => setExtractNotice(null)}
            reviewError={reviewError}
            onApplyQuickPaste={handleApplyQuickPaste}
            onReplaceItem={handleReplaceSingleItem}
            onAddMedication={() => {
              markResultStaleIfPresent();
              addMedication();
            }}
            onUpdateMedication={(id, patch) => {
              markResultStaleIfPresent();
              updateMedication(id, patch);
            }}
            onRemoveMedication={(id) => {
              markResultStaleIfPresent();
              removeMedication(id);
            }}
            onLookupMedication={handleLookup}
            onConfirmCandidate={handleConfirmCandidate}
            onResetRecognition={handleResetRecognition}
            onSubmitReview={handleSubmitReview}
          />
        </div>

        <div className="lg:col-span-5">
          <RightWorkspaceSidebar
            reviewResult={reviewSnapshot?.result ?? null}
            isStaleResult={isStaleResult}
            submitting={submitting}
            onRecheck={handleSubmitReview}
            onOpenHandoff={() => setHandoffOpen(true)}
          />
        </div>
      </div>

      {/* Results Section Below Workspace */}
      <div ref={resultsSectionRef} className="border-t border-[#E2E8F0] pt-6">
        {submitting ? (
          <LoadingPanel
            title="Đang kiểm tra tương tác thuốc…"
            description="Đang đối chiếu từng cặp và kiểm tra điều kiện an toàn."
          />
        ) : !reviewSnapshot ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-[#475569]">Kết quả đối chiếu sẽ xuất hiện tại đây</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviewSnapshot.isStale ? (
              <div
                role="status"
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-2.5">
                  <IconAlertTriangle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-[#D97706]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-[#92400E]">Dữ liệu đã thay đổi — kết quả bên dưới là của lần kiểm tra trước</p>
                    <p className="mt-0.5 text-xs text-[#78350F]">
                      Danh sách thuốc hiện tại chưa được đối chiếu lại. Bấm &quot;Kiểm tra lại&quot; để cập nhật kết quả mới.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
                >
                  <IconRefresh size={15} stroke={1.6} aria-hidden="true" />
                  <span>Kiểm tra lại</span>
                </button>
              </div>
            ) : null}

            <div className={reviewSnapshot.isStale ? 'opacity-75' : ''}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                  <span className="text-base font-medium text-[#0F172A]">
                    {reviewSnapshot.isStale ? 'Kết quả lần kiểm tra trước (Chưa cập nhật)' : 'Kết quả đối chiếu'}
                  </span>
                  {technicalMode ? (
                    <span translate="no" className="font-mono">
                      {reviewSnapshot.result.sessionId}
                    </span>
                  ) : null}
                </div>
                <Link
                  to={`/results/${reviewSnapshot.result.sessionId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline"
                >
                  <span>Mở trang báo cáo riêng</span>
                  <IconExternalLink size={14} stroke={1.6} aria-hidden="true" />
                </Link>
              </div>

              <ReviewResultView result={reviewSnapshot.result} showScheduleSection={false} />
            </div>
          </div>
        )}
      </div>

      <PharmacistHandoffModal
        open={handoffOpen}
        draft={sidebarHandoffDraft}
        onClose={() => setHandoffOpen(false)}
      />
    </div>
  );
}
