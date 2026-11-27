import { useState } from 'react';
import { IconPhoneCall } from '@tabler/icons-react';
import { EmptyPanel } from '@/components/common/StateFeedback';
import { PharmacistHandoffModal } from '@/components/handoff/PharmacistHandoffModal';
import { PairComparisonCard } from '@/components/interaction/PairComparisonCard';
import { AiExplanationSection } from '@/components/results/AiExplanationSection';
import { MedicationNormalizationTable } from '@/components/results/MedicationNormalizationTable';
import { SafetyStatusBanner } from '@/components/results/SafetyStatusBanner';
import { ScheduleDraftSection } from '@/components/results/ScheduleDraftSection';
import { TechnicalTracePanel } from '@/components/results/TechnicalTracePanel';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import type { InteractionSeverity, MedicationReviewResult } from '@/types/interaction';
import { cn } from '@/utils/cn';

type SeverityFilter = 'all' | InteractionSeverity;

const FILTER_OPTIONS: Array<{ key: SeverityFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'nang', label: 'Nghiêm trọng' },
  { key: 'trung_binh', label: 'Trung bình' },
  { key: 'nhe', label: 'Nhẹ' },
  { key: 'no_record', label: 'Chưa ghi nhận' },
  { key: 'unknown', label: 'Ngoài dữ liệu' },
];

interface ReviewResultViewProps {
  result: MedicationReviewResult;
  showScheduleSection?: boolean;
  severityFilter?: SeverityFilter;
  onSeverityFilterChange?: (next: SeverityFilter) => void;
}

export function ReviewResultView({
  result,
  showScheduleSection = true,
  severityFilter: controlledFilter,
  onSeverityFilterChange,
}: ReviewResultViewProps) {
  const [localFilter, setLocalFilter] = useState<SeverityFilter>('all');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const { technicalMode } = useTechnicalMode();

  const filter = controlledFilter ?? localFilter;
  const setFilter = onSeverityFilterChange ?? setLocalFilter;

  const filteredPairs =
    filter === 'all' ? result.pairComparisons : result.pairComparisons.filter((p) => p.severity === filter);

  return (
    <div className="space-y-6">
      {/* Emergency Red Flag Alert */}
      {result.redFlag.detected ? (
        <div role="alert" className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-5 text-[#991B1B]">
          <div className="flex items-start gap-3">
            <IconPhoneCall size={20} stroke={1.6} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
            <div>
              <h2 className="text-base font-medium text-[#991B1B]">
                Cảnh báo dấu hiệu cần đi khám hoặc gọi 115 ngay
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#7F1D1D]">{result.redFlag.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* 7.1 Overall Status & 7.2 Summary Metrics */}
      <SafetyStatusBanner overview={result.overview} onOpenHandoff={() => setHandoffOpen(true)} />

      {/* 7.3 Medication Normalization Table */}
      <MedicationNormalizationTable medications={result.medications} />

      {/* 7.4 Interaction Results */}
      <section aria-labelledby="interactions-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="interactions-heading" className="text-base font-medium text-[#0F172A] sm:text-lg">
              Cảnh báo tương tác (<span className="tabular-nums">{result.pairComparisons.length}</span> cặp)
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Sắp xếp theo mức độ ưu tiên — chưa có bản ghi không đồng nghĩa đã chứng minh không tương tác
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc mức độ tương tác">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={cn(
                  'min-h-[40px] rounded-lg px-3 text-xs font-medium transition-colors sm:min-h-0 sm:h-8',
                  filter === opt.key
                    ? 'bg-[#0F766E] text-white'
                    : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {result.pairComparisons.length === 0 ? (
            <EmptyPanel
              title="Chỉ có 1 thuốc trong danh sách"
              description="Cần ít nhất 2 loại thuốc để đối chiếu tương tác theo cặp."
            />
          ) : filteredPairs.length === 0 ? (
            <EmptyPanel
              title="Không có cặp thuộc mức lọc này"
              description="Chọn 'Tất cả' để xem lại toàn bộ danh sách đối chiếu."
            />
          ) : (
            filteredPairs.map((pair) => <PairComparisonCard key={pair.id} item={pair} />)
          )}
        </div>
      </section>

      {/* Schedule Draft (for standalone /results/:sessionId view; /checker renders schedule in Right Column) */}
      {showScheduleSection ? (
        <ScheduleDraftSection
          scheduleDraft={result.scheduleDraft}
          onOpenHandoff={() => setHandoffOpen(true)}
        />
      ) : null}

      {/* 7.5 AI Explanation ("Điều cần lưu ý") */}
      <AiExplanationSection explanation={result.aiExplanation} />

      {/* Section 8 – Technical Mode (Controlled by header toggle, collapsed/hidden by default) */}
      {technicalMode ? <TechnicalTracePanel trace={result.technicalTrace} /> : null}

      <PharmacistHandoffModal
        open={handoffOpen}
        draft={result.handoffDraft}
        onClose={() => setHandoffOpen(false)}
      />
    </div>
  );
}
