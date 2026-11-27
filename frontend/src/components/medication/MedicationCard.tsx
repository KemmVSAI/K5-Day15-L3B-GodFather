import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconHelpCircle,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { RecognitionBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { resetMedicationOnNameChange } from '@/hooks/useCheckerDraft';
import type { DosageForm, MedicationInputItem, NormalizedCandidate } from '@/types/medication';
import { cn } from '@/utils/cn';

const DOSAGE_FORM_OPTIONS: Array<{ value: DosageForm; label: string }> = [
  { value: 'vien_nen', label: 'Viên nén / bao phim' },
  { value: 'vien_nang', label: 'Viên nang' },
  { value: 'vien_sui', label: 'Viên sủi' },
  { value: 'dung_dich', label: 'Dung dịch / gói uống' },
  { value: 'khac', label: 'Dạng khác' },
];

interface MedicationCardProps {
  index: number;
  item: MedicationInputItem;
  canRemove: boolean;
  nameError?: string;
  confirmationError?: string;
  onReplaceItem: (id: string, nextItem: MedicationInputItem) => void;
  onChange: (id: string, patch: Partial<MedicationInputItem>) => void;
  onLookup: (id: string, query: string) => void;
  onConfirmCandidate: (id: string, candidate: NormalizedCandidate) => void;
  onResetRecognition: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MedicationCard({
  index,
  item,
  canRemove,
  nameError,
  confirmationError,
  onReplaceItem,
  onChange,
  onLookup,
  onConfirmCandidate,
  onResetRecognition,
  onRemove,
}: MedicationCardProps) {
  const { technicalMode } = useTechnicalMode();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showExtra, setShowExtra] = useState(Boolean(item.prescriptionNote.trim()));

  // Close extra fields automatically if prescription note was cleared via name reset
  useEffect(() => {
    if (!item.prescriptionNote.trim() && item.recognitionStatus === 'idle' && !item.strength) {
      setShowExtra(false);
    }
  }, [item.prescriptionNote, item.recognitionStatus, item.strength]);

  const handleNameChange = (value: string) => {
    const nextItem = resetMedicationOnNameChange(item, value);
    onReplaceItem(item.id, nextItem);
  };

  return (
    <div
      id={`med-card-${item.id}`}
      className={cn(
        'rounded-xl border bg-white p-4 transition-colors',
        nameError || confirmationError ? 'border-[#FECACA]' : 'border-[#E2E8F0]',
      )}
    >
      {/* Row Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F1F5F9] font-mono text-xs font-medium text-[#475569] tabular-nums">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-[#0F172A]">
            {item.rawName.trim() ? item.rawName.trim() : `Thuốc ${index + 1}`}
          </span>
          {item.matchedGenericName ? (
            <span className="text-xs text-[#64748B]">→ {item.matchedGenericName}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <RecognitionBadge status={item.recognitionStatus} />
          {canRemove && !confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Xóa thuốc ${item.rawName || index + 1}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8"
            >
              <IconTrash size={16} stroke={1.6} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {confirmingDelete ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs">
          <span className="font-medium text-[#991B1B]">Xóa thuốc này khỏi danh sách?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="min-h-[40px] rounded-md border border-[#E2E8F0] bg-white px-3 font-medium text-[#475569] hover:bg-[#F8FAFC] sm:min-h-0 sm:py-1"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="min-h-[40px] rounded-md bg-[#DC2626] px-3 font-medium text-white hover:bg-[#B91C1C] sm:min-h-0 sm:py-1"
            >
              Xóa
            </button>
          </div>
        </div>
      ) : null}

      {/* Core Fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <label htmlFor={`med-name-${item.id}`} className="block text-xs font-medium text-[#475569]">
            Tên thuốc <span className="text-[#DC2626]">*</span>
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={`med-name-${item.id}`}
              name={`med_name_${item.id}`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={item.rawName}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onLookup(item.id, item.rawName);
                }
              }}
              placeholder="Glucophage, Coversyl"
              className={cn(
                'h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9',
                nameError ? 'border-[#DC2626]' : 'border-[#CBD5E1]',
              )}
            />
            <button
              id={`med-lookup-${item.id}`}
              type="button"
              disabled={!item.rawName.trim() || item.recognitionStatus === 'searching'}
              onClick={() => onLookup(item.id, item.rawName)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:h-9"
            >
              {item.recognitionStatus === 'searching' ? (
                <IconLoader2 size={15} stroke={1.6} className="animate-spin text-[#0F766E]" aria-hidden="true" />
              ) : (
                <IconSearch size={15} stroke={1.6} className="text-[#475569]" aria-hidden="true" />
              )}
              <span>Nhận diện</span>
            </button>
          </div>
          {nameError ? <p className="mt-1 text-xs text-[#DC2626]">{nameError}</p> : null}
        </div>

        <div className="sm:col-span-4">
          <label htmlFor={`med-active-${item.id}`} className="block text-xs font-medium text-[#475569]">
            Hoạt chất
          </label>
          <input
            id={`med-active-${item.id}`}
            name={`med_active_${item.id}`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={item.activeIngredient}
            onChange={(e) => onChange(item.id, { activeIngredient: e.target.value })}
            placeholder="Tự điền khi nhận diện"
            className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`med-strength-${item.id}`} className="block text-xs font-medium text-[#475569]">
            Hàm lượng
          </label>
          <input
            id={`med-strength-${item.id}`}
            name={`med_strength_${item.id}`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={item.strength}
            onChange={(e) => onChange(item.id, { strength: e.target.value })}
            placeholder="500mg"
            className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
          />
        </div>
      </div>

      {/* Collapsible Usage & Dosage Form */}
      <div className="mt-3">
        <button
          type="button"
          aria-expanded={showExtra}
          onClick={() => setShowExtra((v) => !v)}
          className="inline-flex min-h-[36px] items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] sm:min-h-0"
        >
          <span>{showExtra ? 'Ẩn thông tin theo đơn' : 'Thêm liều dùng / thời điểm theo đơn'}</span>
          {showExtra ? (
            <IconChevronUp size={14} stroke={1.6} aria-hidden="true" />
          ) : (
            <IconChevronDown size={14} stroke={1.6} aria-hidden="true" />
          )}
        </button>

        {showExtra ? (
          <div className="mt-2 grid grid-cols-1 gap-3 border-t border-[#F1F5F9] pt-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`med-note-${item.id}`} className="block text-xs font-medium text-[#475569]">
                Liều dùng / thời điểm theo đơn
              </label>
              <input
                id={`med-note-${item.id}`}
                name={`med_note_${item.id}`}
                type="text"
                autoComplete="off"
                value={item.prescriptionNote}
                onChange={(e) => onChange(item.id, { prescriptionNote: e.target.value })}
                placeholder="Sáng 1 viên sau ăn"
                className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
              />
            </div>

            <div>
              <label htmlFor={`med-form-${item.id}`} className="block text-xs font-medium text-[#475569]">
                Dạng thuốc
              </label>
              <select
                id={`med-form-${item.id}`}
                name={`med_form_${item.id}`}
                value={item.dosageForm}
                onChange={(e) => onChange(item.id, { dosageForm: e.target.value as DosageForm })}
                className="mt-2 h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:h-9"
              >
                {DOSAGE_FORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recognition States */}
      {item.recognitionStatus === 'searching' ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center gap-2 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-xs text-[#0F766E]"
        >
          <IconLoader2 size={15} stroke={1.6} className="shrink-0 animate-spin" aria-hidden="true" />
          <span>Đang đối chiếu trong danh mục 18 hoạt chất…</span>
        </div>
      ) : null}

      {item.recognitionStatus === 'suggested' && item.candidates && item.candidates.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
          <p className="text-xs font-medium text-[#92400E]">
            Đối chiếu vỏ hộp và xác nhận hoạt chất
          </p>
          <div className="mt-2 space-y-2">
            {item.candidates.map((cand, cIdx) => (
              <div
                key={cand.code}
                className="flex flex-col justify-between gap-2 rounded-lg border border-[#FCD34D] bg-white p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {technicalMode ? (
                      <span
                        translate="no"
                        className="rounded bg-[#F0FDFA] px-1.5 py-0.5 font-mono text-xs font-medium text-[#0F766E]"
                      >
                        {cand.code}
                      </span>
                    ) : null}
                    <span className="text-sm font-medium text-[#0F172A]">{cand.genericName}</span>
                    <span className="text-xs text-[#64748B]">{cand.drugClass}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#475569]">{cand.reason}</p>
                </div>
                <button
                  id={cIdx === 0 ? `med-confirm-${item.id}` : undefined}
                  type="button"
                  onClick={() => onConfirmCandidate(item.id, cand)}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-8"
                >
                  <IconCheck size={15} stroke={1.6} aria-hidden="true" />
                  <span>Xác nhận</span>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#78350F]">
            <span>Không đúng thuốc?</span>
            <button
              type="button"
              onClick={() =>
                onChange(item.id, {
                  recognitionStatus: 'not_in_catalog',
                  matchedDrugCode: undefined,
                  matchedGenericName: undefined,
                  matchReason: 'Đánh dấu thuốc ngoài danh mục hiện tại.',
                })
              }
              className="min-h-[36px] font-medium underline hover:text-[#451A03] sm:min-h-0"
            >
              Đánh dấu ngoài dữ liệu
            </button>
          </div>
        </div>
      ) : null}

      {item.recognitionStatus === 'confirmed' && item.matchedDrugCode ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[#166534]">
            {technicalMode ? (
              <span translate="no" className="font-mono font-medium">
                {item.matchedDrugCode}
              </span>
            ) : null}
            <span className="font-medium">{item.matchedGenericName}</span>
            {item.matchedDrugClass ? <span className="text-[#15803D]">· {item.matchedDrugClass}</span> : null}
          </div>
          <button
            type="button"
            onClick={() => onResetRecognition(item.id)}
            className="inline-flex min-h-[36px] items-center gap-1 font-medium text-[#166534] hover:underline sm:min-h-0"
          >
            <IconRefresh size={14} stroke={1.6} aria-hidden="true" />
            <span>Chọn lại</span>
          </button>
        </div>
      ) : null}

      {item.recognitionStatus === 'not_in_catalog' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-[#334155]">
            <IconHelpCircle size={15} stroke={1.6} className="shrink-0 text-[#64748B]" aria-hidden="true" />
            <span>Chưa tìm thấy thuốc này trong danh mục 18 hoạt chất</span>
          </div>
          <button
            type="button"
            onClick={() => onResetRecognition(item.id)}
            className="inline-flex min-h-[36px] items-center gap-1 font-medium text-[#475569] hover:text-[#0F172A] sm:min-h-0"
          >
            <IconRefresh size={14} stroke={1.6} aria-hidden="true" />
            <span>Tìm lại</span>
          </button>
        </div>
      ) : null}

      {confirmationError ? <p className="mt-2 text-xs font-medium text-[#DC2626]">{confirmationError}</p> : null}
    </div>
  );
}
