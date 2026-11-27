import {
  IconAlertOctagon,
  IconMessageQuestion,
  IconMoon,
  IconSun,
  IconSunrise,
} from '@tabler/icons-react';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import type { ScheduleDraft } from '@/types/interaction';
import type { TimeSlot } from '@/types/medication';

const SLOT_META: Array<{
  key: TimeSlot;
  title: string;
  icon: typeof IconSunrise;
}> = [
  { key: 'sang', title: 'Buổi sáng', icon: IconSunrise },
  { key: 'trua', title: 'Buổi trưa', icon: IconSun },
  { key: 'toi', title: 'Buổi tối', icon: IconMoon },
];

export function ScheduleDraftSection({
  scheduleDraft,
  onOpenHandoff,
}: {
  scheduleDraft: ScheduleDraft;
  onOpenHandoff?: () => void;
}) {
  const { technicalMode } = useTechnicalMode();

  return (
    <section aria-labelledby="schedule-draft-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="schedule-draft-heading" className="text-base font-medium text-[#0F172A] sm:text-lg">
          Lịch thuốc nháp
        </h2>
        <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-medium text-[#475569]">
          Bản nháp
        </span>
      </div>

      {!scheduleDraft.allowed ? (
        <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <div className="flex items-start gap-3">
            <IconAlertOctagon size={20} stroke={1.6} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-[#991B1B]">
                Tạm chặn lịch uống hoàn chỉnh để đảm bảo an toàn
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#7F1D1D]">{scheduleDraft.blockedReason}</p>

              {scheduleDraft.heldForPharmacist.length > 0 ? (
                <ul className="mt-3 space-y-1.5 rounded-lg border border-[#FCA5A5] bg-white p-3 text-xs text-[#7F1D1D]">
                  {scheduleDraft.heldForPharmacist.map((item) => (
                    <li key={item.code}>
                      {technicalMode ? (
                        <span translate="no" className="mr-1 font-mono font-medium">
                          [{item.code}]
                        </span>
                      ) : null}
                      <span className="font-medium text-[#0F172A]">{item.pair}:</span> {item.recommendation}
                    </li>
                  ))}
                </ul>
              ) : null}

              {onOpenHandoff ? (
                <button
                  type="button"
                  onClick={onOpenHandoff}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#DC2626] px-4 text-xs font-medium text-white transition-colors hover:bg-[#B91C1C] sm:min-h-0 sm:h-9"
                >
                  <IconMessageQuestion size={16} stroke={1.6} aria-hidden="true" />
                  <span>Chuẩn bị nội dung hỏi dược sĩ</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {scheduleDraft.separationNotes.length > 0 ? (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#92400E]">
              <ul className="list-disc space-y-1 pl-4">
                {scheduleDraft.separationNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {SLOT_META.map((slot) => {
              const Icon = slot.icon;
              const items = scheduleDraft.slots[slot.key] ?? [];
              return (
                <div key={slot.key} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                    <Icon size={16} stroke={1.6} className="text-[#475569]" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-[#0F172A]">{slot.title}</h3>
                  </div>

                  {items.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#64748B]">Không có thuốc</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {items.map((entry) => (
                        <li
                          key={`${slot.key}-${entry.code}`}
                          className="rounded-lg border border-[#E2E8F0] bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-[#0F172A]">{entry.displayName}</span>
                            {technicalMode ? (
                              <span
                                translate="no"
                                className="shrink-0 rounded bg-[#F1F4F9] px-1.5 py-0.5 font-mono text-xs text-[#475569]"
                              >
                                {entry.code}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 text-xs font-medium text-[#0F766E]">
                              {entry.mealLabel}
                            </span>
                            {entry.separatedByRule ? (
                              <span className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#B45309]">
                                {entry.separatedByRule}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[#475569]">{entry.timingNote}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-[#64748B]">{scheduleDraft.disclaimer}</p>
    </section>
  );
}
