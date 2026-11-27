import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconArrowRight, IconCalendarClock, IconCopy, IconMessageQuestion } from '@tabler/icons-react';
import { toast } from 'sonner';
import { EmptyPanel } from '@/components/common/StateFeedback';
import { PharmacistHandoffModal } from '@/components/handoff/PharmacistHandoffModal';
import { ScheduleDraftSection } from '@/components/results/ScheduleDraftSection';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { saveReusedSessionAsNewDraft } from '@/hooks/useCheckerDraft';
import { medicationService } from '@/services/medicationService';
import type { MedicationReviewResult } from '@/types/interaction';
import { formatDateTimeVi } from '@/utils/cn';

function formatOptionSeverity(s: MedicationReviewResult): string {
  if (s.overview.severityCounts.nang > 0) return 'Có cảnh báo nặng';
  if (s.overview.severityCounts.trung_binh > 0) return 'Cảnh báo TB';
  if (s.overview.unknownMedicationsCount > 0) return 'Có thuốc ngoài danh mục';
  return 'Chưa ghi nhận tương tác';
}

export function SchedulePage() {
  const navigate = useNavigate();
  const { technicalMode } = useTechnicalMode();
  const { userSessions, demoSessions } = medicationService.listSessions();
  const allSessions = [...userSessions, ...demoSessions];
  const defaultSession = medicationService.getLatestScheduleEligibleSession() ?? allSessions[0] ?? null;

  const [selectedId, setSelectedId] = useState<string>(defaultSession?.sessionId ?? '');
  const [handoffOpen, setHandoffOpen] = useState(false);

  const selectedSession: MedicationReviewResult | null =
    allSessions.find((s) => s.sessionId === selectedId) ?? defaultSession;

  const handleReuseSession = (session: MedicationReviewResult) => {
    saveReusedSessionAsNewDraft(session);
    const label = `${session.profile.displayName || 'Người thân'} · ${formatDateTimeVi(session.createdAt)}`;
    toast.success('Đã nạp danh sách từ phiên này sang khu vực kiểm tra');
    navigate('/checker', { state: { reusedFromLabel: label } });
  };

  if (!selectedSession) {
    return (
      <EmptyPanel
        icon={<IconCalendarClock size={20} stroke={1.6} aria-hidden="true" />}
        title="Chưa có lịch thuốc nháp"
        description="Nhập danh sách thuốc để hệ thống đối chiếu trước khi tạo lịch theo buổi."
        action={
          <Link
            to="/checker"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-10"
          >
            <span>Kiểm tra thuốc</span>
            <IconArrowRight size={16} stroke={1.6} aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="schedule_session_id"
              aria-label="Chọn phiên kiểm tra"
              value={selectedSession.sessionId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-h-[44px] w-full max-w-xl rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] focus:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/25 focus-visible:outline-none sm:min-h-0 sm:h-9"
            >
              {allSessions.map((s) => {
                const name = s.profile.displayName || 'Người thân';
                const drugCount = s.overview.totalMedications;
                const time = formatDateTimeVi(s.createdAt);
                const status = formatOptionSeverity(s);
                const origin = s.isDemoSession ? 'Mẫu' : 'Của bạn';
                const codeSuffix = technicalMode ? ` · ${s.sessionId}` : '';
                return (
                  <option key={s.sessionId} value={s.sessionId}>
                    {name} · {time} · {drugCount} thuốc · {status} ({origin}){codeSuffix}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="text-xs text-[#64748B] tabular-nums">
            {selectedSession.medications.map((m) => m.rawName).join(', ')} · {formatDateTimeVi(selectedSession.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleReuseSession(selectedSession)}
            className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#0F766E] transition-colors hover:bg-[#F0FDFA] sm:min-h-0 sm:h-9"
          >
            <IconCopy size={14} stroke={1.6} aria-hidden="true" />
            <span>Dùng lại danh sách này</span>
          </button>
          <Link
            to={`/results/${selectedSession.sessionId}`}
            className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] sm:min-h-0 sm:h-9"
          >
            Xem báo cáo
          </Link>
          <button
            type="button"
            onClick={() => setHandoffOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
          >
            <IconMessageQuestion size={15} stroke={1.6} aria-hidden="true" />
            <span>Hỏi dược sĩ</span>
          </button>
        </div>
      </div>

      <ScheduleDraftSection
        scheduleDraft={selectedSession.scheduleDraft}
        onOpenHandoff={() => setHandoffOpen(true)}
      />

      <PharmacistHandoffModal
        open={handoffOpen}
        draft={selectedSession.handoffDraft}
        onClose={() => setHandoffOpen(false)}
      />
    </div>
  );
}
