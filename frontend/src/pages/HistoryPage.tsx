import { Link, useNavigate } from 'react-router';
import { IconArrowRight, IconCopy, IconHistory, IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { EmptyPanel } from '@/components/common/StateFeedback';
import { SeverityBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { saveReusedSessionAsNewDraft } from '@/hooks/useCheckerDraft';
import { medicationService } from '@/services/medicationService';
import type { MedicationReviewResult } from '@/types/interaction';
import { formatDateTimeVi } from '@/utils/cn';

function SessionRows({
  sessions,
  isDemo,
  technicalMode,
  onReuse,
}: {
  sessions: MedicationReviewResult[];
  isDemo: boolean;
  technicalMode: boolean;
  onReuse: (session: MedicationReviewResult) => void;
}) {
  return (
    <div className="divide-y divide-[#F1F4F9] rounded-xl border border-[#E2E8F0] bg-white">
      {sessions.map((session) => {
        const topSeverity =
          session.overview.severityCounts.nang > 0
            ? 'nang'
            : session.overview.severityCounts.trung_binh > 0
              ? 'trung_binh'
              : session.overview.unknownMedicationsCount > 0
                ? 'unknown'
                : session.overview.severityCounts.nhe > 0
                  ? 'nhe'
                  : 'no_record';
        const displayName = session.profile.displayName || 'Người thân';
        const ageLabel =
          session.profile.ageGroup && !displayName.toLowerCase().includes('tuổi')
            ? ` (${session.profile.ageGroup})`
            : '';

        return (
          <div
            key={session.sessionId}
            className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-[#F8FAFC] md:flex-row md:items-center"
          >
            <Link to={`/results/${session.sessionId}`} className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[#0F172A]">
                  {displayName}
                  {ageLabel}
                </span>
                <span className="rounded bg-[#F1F4F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
                  {isDemo ? 'Dữ liệu mẫu' : 'Của bạn'}
                </span>
                <span className="text-xs text-[#64748B] tabular-nums">
                  {session.overview.totalMedications} thuốc · {formatDateTimeVi(session.createdAt)}
                </span>
                {technicalMode ? (
                  <span translate="no" className="font-mono text-xs text-[#64748B]">
                    {session.sessionId}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-[#64748B]">
                {session.medications.map((m) => `${m.rawName}${m.strength ? ` ${m.strength}` : ''}`).join(', ')}
              </p>
              {session.profile.notes ? (
                <p className="truncate text-xs text-[#94A3B8]">Ghi chú: {session.profile.notes}</p>
              ) : null}
            </Link>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <SeverityBadge severity={topSeverity} />
              <button
                type="button"
                onClick={() => onReuse(session)}
                className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#0F766E] transition-colors hover:bg-[#F0FDFA] sm:min-h-0 sm:h-9"
              >
                <IconCopy size={14} stroke={1.6} aria-hidden="true" />
                <span>Dùng lại danh sách này</span>
              </button>
              <Link
                to={`/results/${session.sessionId}`}
                aria-label={`Xem báo cáo của ${displayName}`}
                className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:min-h-0 sm:h-9"
              >
                <span>Xem báo cáo</span>
                <IconArrowRight size={14} stroke={1.6} aria-hidden="true" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { technicalMode } = useTechnicalMode();
  const { userSessions, demoSessions } = medicationService.listSessions();

  const handleReuseSession = (session: MedicationReviewResult) => {
    saveReusedSessionAsNewDraft(session);
    const label = `${session.profile.displayName || 'Người thân'} · ${formatDateTimeVi(session.createdAt)}`;
    toast.success('Đã tạo bản nháp mới từ phiên trước');
    navigate('/checker', { state: { reusedFromLabel: label } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight text-[#0F172A] sm:text-2xl">
          Lịch sử kiểm tra thuốc
        </h1>
        <p className="mt-1 text-sm text-[#475569]">
          Xem lại báo cáo trước đó hoặc nạp lại danh sách thuốc để chỉnh sửa thành lượt kiểm tra mới
        </p>
      </div>

      <section aria-labelledby="user-history-heading" className="space-y-3">
        <h2 id="user-history-heading" className="text-base font-medium text-[#0F172A]">
          Phiên kiểm tra của bạn
        </h2>

        {userSessions.length === 0 ? (
          <EmptyPanel
            icon={<IconHistory size={20} stroke={1.6} aria-hidden="true" />}
            title="Chưa có phiên kiểm tra nào"
            description="Các lượt kiểm tra bạn thực hiện sẽ được lưu cục bộ tại đây."
            action={
              <Link
                to="/checker"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
              >
                <IconPlus size={15} stroke={1.6} aria-hidden="true" />
                <span>Kiểm tra thuốc</span>
              </Link>
            }
          />
        ) : (
          <SessionRows
            sessions={userSessions}
            isDemo={false}
            technicalMode={technicalMode}
            onReuse={handleReuseSession}
          />
        )}
      </section>

      <section aria-labelledby="demo-history-heading" className="space-y-3">
        <h2 id="demo-history-heading" className="text-base font-medium text-[#0F172A]">
          Ca mẫu đối chiếu
        </h2>
        <SessionRows
          sessions={demoSessions}
          isDemo
          technicalMode={technicalMode}
          onReuse={handleReuseSession}
        />
      </section>
    </div>
  );
}
