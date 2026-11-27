import { IconAlertOctagon, IconAlertTriangle, IconCircleCheck, IconMessageQuestion } from '@tabler/icons-react';
import type { OverallSafetyStatus, ReviewOverview } from '@/types/interaction';
import { cn } from '@/utils/cn';

const BANNER_STYLES: Record<
  OverallSafetyStatus,
  {
    wrapper: string;
    titleColor: string;
    iconColor: string;
    label: string;
    fallbackMessage: string;
    icon: typeof IconAlertOctagon;
  }
> = {
  red: {
    wrapper: 'border-[#FECACA] bg-[#FEF2F2]',
    titleColor: 'text-[#991B1B]',
    iconColor: 'text-[#DC2626]',
    label: 'Cảnh báo nghiêm trọng',
    fallbackMessage: 'Phát hiện tương tác nghiêm trọng — lịch thuốc hoàn chỉnh đã bị khóa.',
    icon: IconAlertOctagon,
  },
  amber: {
    wrapper: 'border-[#FDE68A] bg-[#FFFBEB]',
    titleColor: 'text-[#92400E]',
    iconColor: 'text-[#D97706]',
    label: 'Cần lưu ý khi đối chiếu',
    fallbackMessage: 'Có thông tin cần lưu ý hoặc xác minh thêm trước khi áp dụng.',
    icon: IconAlertTriangle,
  },
  green: {
    wrapper: 'border-[#BBF7D0] bg-[#F0FDF4]',
    titleColor: 'text-[#166534]',
    iconColor: 'text-[#15803D]',
    label: 'Đã hoàn tất đối chiếu trong phạm vi dữ liệu',
    fallbackMessage: 'Đã hoàn tất đối chiếu trong phạm vi dữ liệu hiện có.',
    icon: IconCircleCheck,
  },
};

function resolveSeveritySummary(overview: ReviewOverview): string {
  const { nang, trung_binh, nhe } = overview.severityCounts;
  const parts: string[] = [];
  if (nang > 0) parts.push(`${nang} cặp nghiêm trọng`);
  if (trung_binh > 0) parts.push(`${trung_binh} cặp trung bình`);
  if (nhe > 0) parts.push(`${nhe} cặp nhẹ`);
  return parts.length > 0 ? parts.join(' · ') : 'Chưa ghi nhận tương tác trong các cặp đã đối chiếu';
}

function resolveHeadline(overview: ReviewOverview): string {
  if (overview.statusHeadline) return overview.statusHeadline;
  if (overview.overallStatus === 'red') return BANNER_STYLES.red.fallbackMessage;
  if (overview.overallStatus === 'green') return BANNER_STYLES.green.fallbackMessage;

  if (overview.unknownMedicationsCount > 0 || overview.pairsNotCovered > 0) {
    return 'Có thuốc ngoài danh mục hoặc cặp chưa có dữ liệu đối chiếu.';
  }
  if (overview.duplicateActiveIngredients.length > 0 && overview.severityCounts.trung_binh > 0) {
    return 'Phát hiện trùng hoạt chất và tương tác mức trung bình cần lưu ý.';
  }
  if (overview.duplicateActiveIngredients.length > 0) {
    return 'Phát hiện hai thuốc có thể trùng hoạt chất cần kiểm tra lại.';
  }
  if (overview.severityCounts.trung_binh > 0) {
    return 'Đã đối chiếu đủ danh mục — có tương tác mức trung bình cần lưu ý.';
  }
  if ((overview.missingStrengthCount ?? 0) > 0) {
    return 'Đã đối chiếu danh mục thuốc — còn thiếu hàm lượng để hoàn thiện thông tin.';
  }
  return BANNER_STYLES.amber.fallbackMessage;
}

export function SafetyStatusBanner({
  overview,
  onOpenHandoff,
}: {
  overview: ReviewOverview;
  onOpenHandoff: () => void;
}) {
  const cfg = BANNER_STYLES[overview.overallStatus];
  const Icon = cfg.icon;
  const headline = resolveHeadline(overview);
  const severitySummary = resolveSeveritySummary(overview);
  const coverageSummary =
    overview.coverageSummary ??
    (overview.confirmedInCatalog === overview.totalMedications && overview.pairsNotCovered === 0
      ? `${overview.totalMedications}/${overview.totalMedications} thuốc thuộc danh mục hỗ trợ · ${overview.pairsCheckedInCatalog}/${overview.totalPairsTheoretical} cặp có dữ liệu đối chiếu`
      : `${overview.confirmedInCatalog}/${overview.totalMedications} thuốc thuộc danh mục · ${overview.unknownMedicationsCount} thuốc ngoài danh mục · ${overview.pairsNotCovered} cặp chưa có dữ liệu`);

  const missingParts: string[] = [];
  if ((overview.missingStrengthCount ?? 0) > 0) {
    missingParts.push(`Chưa ghi hàm lượng cho ${overview.missingStrengthCount} thuốc`);
  }
  if ((overview.missingNotesCount ?? 0) > 0) {
    missingParts.push(`Chưa có hướng dẫn theo đơn cho ${overview.missingNotesCount} thuốc`);
  }
  const missingSummary =
    overview.missingInfoSummary ??
    (missingParts.length > 0 ? missingParts.join(' · ') : 'Đủ hàm lượng và hướng dẫn theo đơn');

  return (
    <section aria-labelledby="safety-status-heading" className="space-y-4">
      <div
        role={overview.overallStatus === 'red' ? 'alert' : 'status'}
        className={cn('rounded-2xl border p-5', cfg.wrapper)}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <Icon size={20} stroke={1.6} className={cn('mt-0.5 shrink-0', cfg.iconColor)} aria-hidden="true" />
            <div className="space-y-2">
              <div>
                <p className={cn('text-xs font-medium', cfg.titleColor)}>{cfg.label}</p>
                <h2 id="safety-status-heading" className={cn('mt-1 text-base font-medium sm:text-lg', cfg.titleColor)}>
                  {headline}
                </h2>
              </div>

              <dl className="grid grid-cols-1 gap-1.5 text-xs text-[#334155]">
                <div>
                  <dt className="inline font-medium text-[#0F172A]">1. Mức độ cảnh báo: </dt>
                  <dd className="inline">{severitySummary}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[#0F172A]">2. Độ bao phủ dữ liệu: </dt>
                  <dd className="inline tabular-nums">{coverageSummary}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-[#0F172A]">3. Thông tin còn thiếu: </dt>
                  <dd className="inline">{missingSummary}</dd>
                </div>
              </dl>

              <p className="text-xs text-[#475569]">
                Chưa ghi nhận tương tác trong danh mục mẫu không đồng nghĩa đã chứng minh an toàn tuyệt đối.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHandoff}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors sm:min-h-0 sm:h-10',
              overview.overallStatus === 'red'
                ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                : overview.overallStatus === 'amber'
                  ? 'bg-[#0F766E] text-white hover:bg-[#0D645D]'
                  : 'border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
            )}
          >
            <IconMessageQuestion size={16} stroke={1.6} aria-hidden="true" />
            <span>Hỏi dược sĩ</span>
          </button>
        </div>
      </div>

      {/* 7.2 Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs text-[#64748B]">Số thuốc</p>
          <p className="mt-1.5 text-2xl font-medium text-[#0F172A] tabular-nums">{overview.totalMedications}</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs text-[#64748B]">Cặp cần kiểm tra</p>
          <p className="mt-1.5 text-2xl font-medium text-[#0F172A] tabular-nums">{overview.totalPairsTheoretical}</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs text-[#64748B]">Cặp có dữ liệu</p>
          <p className="mt-1.5 text-2xl font-medium text-[#0F766E] tabular-nums">{overview.pairsCheckedInCatalog}</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-xs text-[#64748B]">Cặp chưa có dữ liệu</p>
          <p className="mt-1.5 text-2xl font-medium text-[#475569] tabular-nums">{overview.pairsNotCovered}</p>
        </div>

        <div className="col-span-2 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:col-span-1">
          <p className="text-xs text-[#64748B]">Cảnh báo theo mức độ</p>
          <p className="mt-2 font-mono text-xs font-medium text-[#0F172A] tabular-nums">
            <span className="text-[#B91C1C]">{overview.severityCounts.nang} nặng</span>
            {' · '}
            <span className="text-[#B45309]">{overview.severityCounts.trung_binh} TB</span>
            {' · '}
            <span className="text-[#0369A1]">{overview.severityCounts.nhe} nhẹ</span>
          </p>
        </div>
      </div>

      {overview.duplicateActiveIngredients.length > 0 ? (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
          <span className="font-medium">Trùng hoạt chất: </span>
          {overview.duplicateActiveIngredients
            .map((d) => `${d.rawNames.join(' & ')} → ${d.genericName}`)
            .join('; ')}
        </div>
      ) : null}
    </section>
  );
}
