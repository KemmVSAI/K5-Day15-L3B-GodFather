import { useState } from 'react';
import {
  IconAlertCircle,
  IconArrowRight,
  IconClipboardText,
  IconListDetails,
  IconListSearch,
  IconLoader2,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { MedicationCard } from '@/components/medication/MedicationCard';
import { ApiUnavailableError, medicationService } from '@/services/medicationService';
import type { MedicationInputItem, NormalizedCandidate, RelativeProfile } from '@/types/medication';
import { cn, normalizeText } from '@/utils/cn';

export type InputTabMode = 'manual' | 'paste';

interface MedicationInputTabsProps {
  activeTab: InputTabMode;
  onTabChange: (tab: InputTabMode) => void;
  quickPasteText: string;
  onQuickPasteChange: (text: string) => void;
  profile: RelativeProfile;
  onUpdateProfile: (patch: Partial<RelativeProfile>) => void;
  medications: MedicationInputItem[];
  nameErrors: Record<string, string>;
  confirmationErrors: Record<string, string>;
  submittingReview: boolean;
  isStaleResult: boolean;
  extractNotice: string | null;
  onDismissExtractNotice: () => void;
  reviewError?: string;
  onApplyQuickPaste: (
    mode: 'replace' | 'append',
    items: MedicationInputItem[],
    note: string,
  ) => void;
  onReplaceItem: (id: string, nextItem: MedicationInputItem) => void;
  onAddMedication: () => void;
  onUpdateMedication: (id: string, patch: Partial<MedicationInputItem>) => void;
  onRemoveMedication: (id: string) => void;
  onLookupMedication: (id: string, query: string) => void;
  onConfirmCandidate: (id: string, candidate: NormalizedCandidate) => void;
  onResetRecognition: (id: string) => void;
  onSubmitReview: () => void;
}

export function MedicationInputTabs({
  activeTab,
  onTabChange,
  quickPasteText,
  onQuickPasteChange,
  profile,
  onUpdateProfile,
  medications,
  nameErrors,
  confirmationErrors,
  submittingReview,
  isStaleResult,
  extractNotice,
  onDismissExtractNotice,
  reviewError,
  onApplyQuickPaste,
  onReplaceItem,
  onAddMedication,
  onUpdateMedication,
  onRemoveMedication,
  onLookupMedication,
  onConfirmCandidate,
  onResetRecognition,
  onSubmitReview,
}: MedicationInputTabsProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<MedicationInputItem[] | null>(null);
  const [previewNote, setPreviewNote] = useState<string>('');

  const nonEmptyCount = medications.filter((m) => m.rawName.trim().length > 0).length;

  const isDuplicateOfExisting = (candidateItem: MedicationInputItem): boolean => {
    const candName = normalizeText(candidateItem.rawName);
    const candCode = candidateItem.candidates?.[0]?.code ?? candidateItem.matchedDrugCode;
    return medications.some((existing) => {
      if (!existing.rawName.trim()) return false;
      if (candCode && existing.matchedDrugCode && existing.matchedDrugCode === candCode) return true;
      return normalizeText(existing.rawName) === candName;
    });
  };

  const handleAnalyzePaste = async () => {
    const trimmed = quickPasteText.trim();
    if (!trimmed) {
      setExtractError('Vui lòng dán hoặc nhập danh sách thuốc trước khi phân tích.');
      return;
    }

    setExtractError(null);
    setExtracting(true);

    try {
      const res = await medicationService.extractMedicationsFromText(trimmed);
      if (res.items.length === 0) {
        setPreviewItems(null);
        setExtractError(
          'Chưa nhận diện được tên thuốc cụ thể. Vui lòng ghi rõ tên thuốc hoặc chuyển sang tab Nhập từng thuốc.',
        );
        return;
      }

      // Always preview and allow editing before replacing or appending
      setPreviewItems(res.items);
      setPreviewNote(res.extractionNote);
      toast.info(`Đã tách ${res.items.length} thuốc — kiểm tra trước khi áp dụng`);
    } catch (err) {
      setExtractError(
        err instanceof ApiUnavailableError
          ? err.message
          : 'Không thể phân tích nội dung lúc này. Vui lòng thử lại.',
      );
    } finally {
      setExtracting(false);
    }
  };

  const handlePreviewUpdate = (id: string, patch: Partial<MedicationInputItem>) => {
    setPreviewItems((prev) =>
      prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : null,
    );
  };

  const handlePreviewRemove = (id: string) => {
    setPreviewItems((prev) => {
      if (!prev) return null;
      const next = prev.filter((item) => item.id !== id);
      return next.length > 0 ? next : null;
    });
  };

  const handleApplyPreview = (mode: 'replace' | 'append') => {
    if (!previewItems || previewItems.length === 0) return;
    const valid = previewItems.filter((p) => p.rawName.trim().length > 0);
    if (valid.length === 0) {
      setExtractError('Cần ít nhất 1 tên thuốc hợp lệ trước khi áp dụng.');
      return;
    }

    onApplyQuickPaste(mode, valid, previewNote);
    setPreviewItems(null);
    setPreviewNote('');
    onTabChange('manual');
  };

  return (
    <section aria-labelledby="input-panel-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      {/* Panel Header + Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div className="flex items-center gap-2">
          <h2 id="input-panel-heading" className="text-base font-medium text-[#0F172A]">
            Danh sách thuốc
          </h2>
          <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569] tabular-nums">
            {nonEmptyCount > 0 ? `${nonEmptyCount} thuốc đã nhập` : 'Chưa nhập tên thuốc'}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Phương thức nhập thuốc"
          className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            onClick={() => onTabChange('manual')}
            className={cn(
              'inline-flex min-h-[36px] items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors sm:min-h-0 sm:h-8',
              activeTab === 'manual'
                ? 'bg-white text-[#0F766E] shadow-xs ring-1 ring-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A]',
            )}
          >
            <IconListDetails size={15} stroke={1.6} aria-hidden="true" />
            <span>Nhập từng thuốc</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paste'}
            onClick={() => onTabChange('paste')}
            className={cn(
              'inline-flex min-h-[36px] items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors sm:min-h-0 sm:h-8',
              activeTab === 'paste'
                ? 'bg-white text-[#0F766E] shadow-xs ring-1 ring-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A]',
            )}
          >
            <IconClipboardText size={15} stroke={1.6} aria-hidden="true" />
            <span>Dán nhanh</span>
          </button>
        </div>
      </div>

      {/* Compact Relative Strip (optional fields) */}
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#F8FAFC] p-3 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <label htmlFor="relative-name" className="block text-xs font-medium text-[#475569]">
            Người thân (tùy chọn)
          </label>
          <input
            id="relative-name"
            name="relative_display_name"
            type="text"
            autoComplete="off"
            value={profile.displayName}
            onChange={(e) => onUpdateProfile({ displayName: e.target.value })}
            placeholder="Mẹ, Bố"
            className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="relative-age" className="block text-xs font-medium text-[#475569]">
            Nhóm tuổi
          </label>
          <select
            id="relative-age"
            name="relative_age_group"
            value={profile.ageGroup}
            onChange={(e) => onUpdateProfile({ ageGroup: e.target.value })}
            className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
          >
            <option value="">Không chọn</option>
            <option value="60–75 tuổi">60–75 tuổi</option>
            <option value="Trên 75 tuổi">Trên 75 tuổi</option>
            <option value="Dưới 60 tuổi">Dưới 60 tuổi</option>
          </select>
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="relative-notes" className="block text-xs font-medium text-[#475569]">
            Ghi chú
          </label>
          <input
            id="relative-notes"
            name="relative_notes"
            type="text"
            autoComplete="off"
            value={profile.notes}
            onChange={(e) => onUpdateProfile({ notes: e.target.value })}
            placeholder="Thói quen ăn uống hoặc triệu chứng"
            className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
          />
        </div>
      </div>

      {/* Tab 1: Manual Rows */}
      {activeTab === 'manual' ? (
        <div role="tabpanel" className="mt-4 space-y-3">
          {extractNotice ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]"
            >
              <span>{extractNotice}</span>
              <button
                type="button"
                onClick={onDismissExtractNotice}
                className="font-medium text-[#0F766E] hover:underline"
              >
                Ẩn thông báo
              </button>
            </div>
          ) : null}

          {medications.map((item, idx) => (
            <MedicationCard
              key={item.id}
              index={idx}
              item={item}
              canRemove={medications.length > 1}
              nameError={nameErrors[item.id]}
              confirmationError={confirmationErrors[item.id]}
              onReplaceItem={onReplaceItem}
              onChange={onUpdateMedication}
              onLookup={onLookupMedication}
              onConfirmCandidate={onConfirmCandidate}
              onResetRecognition={onResetRecognition}
              onRemove={onRemoveMedication}
            />
          ))}

          <button
            type="button"
            onClick={onAddMedication}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F1F5F9] sm:min-h-0 sm:h-9"
          >
            <IconPlus size={15} stroke={1.6} aria-hidden="true" />
            <span>Thêm thuốc</span>
          </button>
        </div>
      ) : (
        /* Tab 2: Quick Paste + Safe Editable Preview */
        <div role="tabpanel" className="mt-4 space-y-4">
          <div>
            <label htmlFor="quick-paste-textarea" className="block text-xs font-medium text-[#475569]">
              Dán tin nhắn hoặc đơn thuốc tự nhiên
            </label>
            <textarea
              id="quick-paste-textarea"
              name="quick_paste_text"
              rows={4}
              value={quickPasteText}
              onChange={(e) => {
                onQuickPasteChange(e.target.value);
                if (extractError) setExtractError(null);
              }}
              placeholder="Levothyrox 50mcg sáng, Canxi D3 trưa, Glucophage 500mg tối"
              className="mt-2 w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-sm leading-relaxed text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none"
            />
          </div>

          {extractError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]"
            >
              <IconAlertCircle size={16} stroke={1.6} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <span>{extractError}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#64748B]">
              Xem trước và chỉnh sửa tên thuốc trước khi áp dụng
            </span>
            <button
              type="button"
              disabled={extracting || !quickPasteText.trim()}
              onClick={handleAnalyzePaste}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#0F766E] bg-[#F0FDFA] px-4 text-xs font-medium text-[#0F766E] transition-colors hover:bg-[#CCFBF1] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:h-9"
            >
              {extracting ? (
                <>
                  <IconLoader2 size={15} stroke={1.6} className="animate-spin" aria-hidden="true" />
                  <span>Đang phân tích</span>
                </>
              ) : (
                <>
                  <IconListSearch size={15} stroke={1.6} aria-hidden="true" />
                  <span>Phân tích danh sách thuốc</span>
                </>
              )}
            </button>
          </div>

          {/* Extracted Preview Box */}
          {previewItems && previewItems.length > 0 ? (
            <div
              aria-label="Xem trước danh sách thuốc đã trích xuất"
              className="space-y-3 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-4"
            >
              <div>
                <h3 className="text-sm font-medium text-[#0F172A]">
                  Xem trước kết quả tách ({previewItems.length} thuốc)
                </h3>
                <p className="mt-1 text-xs text-[#475569]">
                  Kiểm tra lại tên thuốc và hàm lượng trước khi đưa vào danh sách chính.
                </p>
              </div>

              <div className="space-y-2">
                {previewItems.map((pItem) => {
                  const isDup = nonEmptyCount > 0 && isDuplicateOfExisting(pItem);
                  return (
                    <div
                      key={pItem.id}
                      className="rounded-lg border border-[#E2E8F0] bg-white p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-medium text-[#475569]">
                            Tên thuốc tách được
                          </label>
                          <input
                            type="text"
                            value={pItem.rawName}
                            onChange={(e) => handlePreviewUpdate(pItem.id, { rawName: e.target.value })}
                            className="mt-1 h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-sm text-[#0F172A]"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-[#475569]">
                            Hàm lượng
                          </label>
                          <input
                            type="text"
                            value={pItem.strength}
                            onChange={(e) => handlePreviewUpdate(pItem.id, { strength: e.target.value })}
                            placeholder="Chưa rõ"
                            className="mt-1 h-9 w-full rounded-lg border border-[#CBD5E1] px-2.5 text-sm text-[#0F172A]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:col-span-4">
                          <div className="min-w-0 text-xs">
                            <span className="block truncate font-medium text-[#0F766E]">
                              {pItem.candidates?.[0]?.genericName
                                ? `Gợi ý: ${pItem.candidates[0].genericName}`
                                : 'Ngoài danh mục hỗ trợ'}
                            </span>
                            {isDup ? (
                              <span className="block text-[#B45309]">Trùng với thuốc đang có</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePreviewRemove(pItem.id)}
                            aria-label={`Bỏ thuốc ${pItem.rawName}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                          >
                            <IconTrash size={15} stroke={1.6} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nonEmptyCount > 0 ? (
                <div className="space-y-2 border-t border-[#99F6E4] pt-3">
                  <p className="text-xs font-medium text-[#0F172A]">
                    Danh sách hiện đang có {nonEmptyCount} thuốc. Bạn muốn áp dụng thế nào?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreview('append')}
                      className="inline-flex min-h-[44px] items-center rounded-lg bg-[#0F766E] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
                    >
                      Thêm vào danh sách hiện tại
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreview('replace')}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] sm:min-h-0 sm:h-9"
                    >
                      Thay thế danh sách hiện tại
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewItems(null)}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-transparent px-3 text-xs font-medium text-[#475569] hover:text-[#0F172A] sm:min-h-0 sm:h-9"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 border-t border-[#99F6E4] pt-3">
                  <button
                    type="button"
                    onClick={() => handleApplyPreview('replace')}
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
                  >
                    Áp dụng vào danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewItems(null)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#475569] sm:min-h-0 sm:h-9"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Primary Review CTA */}
      {reviewError ? (
        <p role="alert" className="mt-4 text-xs font-medium text-[#DC2626]">
          {reviewError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
        <span className="text-xs text-[#64748B] tabular-nums">
          Tổng cặp cần đối chiếu: {(nonEmptyCount * Math.max(0, nonEmptyCount - 1)) / 2}
        </span>

        <button
          type="button"
          disabled={submittingReview || nonEmptyCount === 0}
          onClick={onSubmitReview}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0D645D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submittingReview ? (
            <>
              <IconLoader2 size={16} stroke={1.6} className="animate-spin" aria-hidden="true" />
              <span>Đang kiểm tra…</span>
            </>
          ) : (
            <>
              <span>{isStaleResult ? 'Kiểm tra lại' : 'Kiểm tra tương tác thuốc'}</span>
              <IconArrowRight size={16} stroke={1.6} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
