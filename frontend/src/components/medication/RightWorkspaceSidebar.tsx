import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCalendarClock,
  IconMessageQuestion,
  IconMoon,
  IconRefresh,
  IconStethoscope,
  IconSun,
  IconSunrise,
} from '@tabler/icons-react';
import type { MedicationReviewResult } from '@/types/interaction';
import type { TimeSlot } from '@/types/medication';
import { cn } from '@/utils/cn';

const TIMELINE_SLOTS: Array<{ key: TimeSlot; label: string; icon: typeof IconSunrise }> = [
  { key: 'sang', label: 'Buổi sáng', icon: IconSunrise },
  { key: 'trua', label: 'Buổi trưa', icon: IconSun },
  { key: 'toi', label: 'Buổi tối', icon: IconMoon },
];

interface RightWorkspaceSidebarProps {
  reviewResult: MedicationReviewResult | null;
  isStaleResult: boolean;
  submitting: boolean;
  onRecheck: () => void;
  onOpenHandoff: () => void;
}

export function RightWorkspaceSidebar({
  reviewResult,
  isStaleResult,
  submitting,
  onRecheck,
  onOpenHandoff,
}: RightWorkspaceSidebarProps) {
  const hasSevereOrUnknown =
    reviewResult !== null &&
    !isStaleResult &&
    (reviewResult.overview.severityCounts.nang > 0 || reviewResult.overview.unknownMedicationsCount > 0);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      {/* 6.1 Schedule Preview */}
      <section aria-labelledby="live-schedule-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2">
            <IconCalendarClock size={18} stroke={1.6} className="text-[#475569]" aria-hidden="true" />
            <h2 id="live-schedule-heading" className="text-base font-medium text-[#0F172A]">
              Lịch thuốc nháp
            </h2>
          </div>
          {reviewResult && isStaleResult ? (
            <span className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#B45309]">
              Cần kiểm tra lại
            </span>
          ) : reviewResult?.scheduleDraft.allowed ? (
            <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">
              Bản nháp
            </span>
          ) : null}
        </div>

        {submitting ? (
          <p className="py-6 text-center text-xs text-[#64748B]">Đang kiểm tra điều kiện an toàn…</p>
        ) : !reviewResult ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center">
            <p className="text-xs leading-relaxed text-[#64748B]">
              Lịch nháp sẽ xuất hiện sau khi hoàn tất đối chiếu
            </p>
          </div>
        ) : isStaleResult ? (
          <div className="mt-4 space-y-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-2.5">
              <IconAlertTriangle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-[#D97706]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-medium text-[#92400E]">Dữ liệu đã thay đổi</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#78350F]">
                  Danh sách thuốc vừa được chỉnh sửa nên lịch nháp trước đó tạm ẩn để tránh áp dụng nhầm. Hãy kiểm tra lại để cập nhật lịch mới.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRecheck}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-9"
            >
              <IconRefresh size={15} stroke={1.6} aria-hidden="true" />
              <span>Kiểm tra lại</span>
            </button>
          </div>
        ) : !reviewResult.scheduleDraft.allowed ? (
          <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
            <div className="flex items-start gap-2.5">
              <IconAlertOctagon size={18} stroke={1.6} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-medium text-[#991B1B]">Lịch thuốc chưa thể tạo</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#7F1D1D]">
                  {reviewResult.scheduleDraft.blockedReason}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {TIMELINE_SLOTS.map((slot) => {
              const Icon = slot.icon;
              const entries = reviewResult.scheduleDraft.slots[slot.key] ?? [];
              return (
                <div key={slot.key} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
                    <Icon size={15} stroke={1.6} className="text-[#64748B]" aria-hidden="true" />
                    <span>{slot.label}</span>
                  </div>

                  {entries.length === 0 ? (
                    <p className="mt-1.5 text-xs text-[#64748B]">Không có thuốc</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {entries.map((entry) => (
                        <li
                          key={`${slot.key}-${entry.code}`}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[#0F172A]">{entry.displayName}</span>
                            <span className="shrink-0 whitespace-nowrap rounded bg-[#F0FDFA] px-1.5 py-0.5 font-medium text-[#0F766E]">
                              {entry.mealLabel}
                            </span>
                          </div>
                          <p className="mt-1 leading-relaxed text-[#475569]">{entry.timingNote}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <p className="text-xs leading-relaxed text-[#64748B]">{reviewResult.scheduleDraft.disclaimer}</p>
          </div>
        )}
      </section>

      {/* 6.2 Pharmacist Handoff */}
      <section
        aria-labelledby="sidebar-handoff-heading"
        className={cn(
          'rounded-2xl border bg-white p-5',
          hasSevereOrUnknown ? 'border-[#E2E8F0] border-l-4 border-l-[#0F766E]' : 'border-[#E2E8F0]',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#475569]">
            <IconStethoscope size={18} stroke={1.6} aria-hidden="true" />
          </div>
          <div>
            <h2 id="sidebar-handoff-heading" className="text-base font-medium text-[#0F172A]">
              Hỏi dược sĩ
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Chuẩn bị thông tin để trao đổi với dược sĩ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenHandoff}
          className={cn(
            'mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors',
            hasSevereOrUnknown
              ? 'bg-[#0F766E] text-white hover:bg-[#0D645D]'
              : 'border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
          )}
        >
          <IconMessageQuestion size={16} stroke={1.6} aria-hidden="true" />
          <span>Soạn nội dung hỏi dược sĩ</span>
        </button>

        <p className="mt-2 text-center text-xs text-[#64748B]">Tạo bản tóm tắt để tự sao chép</p>
      </section>
    </aside>
  );
}
