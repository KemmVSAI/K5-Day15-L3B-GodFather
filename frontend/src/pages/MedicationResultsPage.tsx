import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { IconArrowLeft, IconCopy } from '@tabler/icons-react';
import { toast } from 'sonner';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/components/common/StateFeedback';
import { SeverityBadge } from '@/components/common/StatusBadge';
import { ReviewResultView } from '@/components/results/ReviewResultView';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { saveReusedSessionAsNewDraft } from '@/hooks/useCheckerDraft';
import { ApiUnavailableError, medicationService } from '@/services/medicationService';
import type { InteractionSeverity, MedicationReviewResult } from '@/types/interaction';
import { formatDateTimeVi } from '@/utils/cn';

type SeverityFilter = 'all' | InteractionSeverity;

const VALID_FILTERS: SeverityFilter[] = ['all', 'nang', 'trung_binh', 'nhe', 'no_record', 'unknown'];

export function MedicationResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { technicalMode } = useTechnicalMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<MedicationReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rawFilter = searchParams.get('severity') as SeverityFilter | null;
  const filter: SeverityFilter = rawFilter && VALID_FILTERS.includes(rawFilter) ? rawFilter : 'all';
  const setFilter = (next: SeverityFilter) => {
    setSearchParams(next === 'all' ? {} : { severity: next }, { replace: true });
  };

  const fetchResult = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await medicationService.getReviewResult(sessionId);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiUnavailableError ? err.message : 'Không thể tải báo cáo kiểm tra thuốc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchResult();
  }, [sessionId]);

  const handleReuseSession = (session: MedicationReviewResult) => {
    saveReusedSessionAsNewDraft(session);
    const label = `${session.profile.displayName || 'Người thân'} · ${formatDateTimeVi(session.createdAt)}`;
    toast.success('Đã tạo bản nháp mới từ phiên này');
    navigate('/checker', { state: { reusedFromLabel: label } });
  };

  if (loading) {
    return <LoadingPanel title="Đang tải báo cáo…" />;
  }

  if (error) {
    return (
      <ErrorPanel
        title="Không thể tải kết quả"
        description={error}
        isOffline
        onRetry={fetchResult}
        action={
          <Link
            to="/checker"
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#0F172A]"
          >
            Quay lại không gian kiểm tra
          </Link>
        }
      />
    );
  }

  if (!result) {
    return (
      <EmptyPanel
        title="Không tìm thấy phiên kiểm tra"
        description="Phiên này không còn trong bộ nhớ trình duyệt hoặc mã không hợp lệ."
        action={
          <Link
            to="/checker"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
          >
            Kiểm tra danh sách mới
          </Link>
        }
      />
    );
  }

  const displayName = result.profile.displayName || 'Người thân';
  const ageLabel =
    result.profile.ageGroup && !displayName.toLowerCase().includes('tuổi')
      ? ` (${result.profile.ageGroup})`
      : '';
  const topSeverity: InteractionSeverity =
    result.overview.severityCounts.nang > 0
      ? 'nang'
      : result.overview.severityCounts.trung_binh > 0
        ? 'trung_binh'
        : result.overview.unknownMedicationsCount > 0
          ? 'unknown'
          : result.overview.severityCounts.nhe > 0
            ? 'nhe'
            : 'no_record';

  return (
    <div className="space-y-4">
      {/* Top Action & Session Context Header */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-medium text-[#0F172A] sm:text-lg">
              Báo cáo đối chiếu: {displayName}
              {ageLabel}
            </h1>
            <SeverityBadge severity={topSeverity} />
            <span className="rounded bg-[#F1F4F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
              {result.isDemoSession ? 'Dữ liệu mẫu' : 'Phiên của bạn'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] tabular-nums">
            {result.overview.totalMedications} thuốc · Kiểm tra lúc {formatDateTimeVi(result.createdAt)}
            {technicalMode ? ` · ${result.sessionId}` : ''}
          </p>
          {result.profile.notes ? (
            <p className="text-xs text-[#475569]">Ghi chú: {result.profile.notes}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleReuseSession(result)}
            className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
          >
            <IconCopy size={14} stroke={1.6} aria-hidden="true" />
            <span>Dùng lại danh sách này</span>
          </button>
          <Link
            to="/checker"
            className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] sm:min-h-0 sm:h-9"
          >
            <IconArrowLeft size={15} stroke={1.6} aria-hidden="true" />
            <span>Quay lại không gian kiểm tra</span>
          </Link>
        </div>
      </div>

      <ReviewResultView result={result} severityFilter={filter} onSeverityFilterChange={setFilter} />
    </div>
  );
}
