import { useState } from 'react';
import { Link } from 'react-router';
import {
  IconArrowRight,
  IconChecklist,
  IconClock,
  IconDatabase,
  IconInfoCircle,
  IconMessageQuestion,
} from '@tabler/icons-react';
import { SeverityBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import { medicationService } from '@/services/medicationService';
import { formatDateTimeVi } from '@/utils/cn';

const THREE_STEPS = [
  {
    step: '01',
    title: 'Nhập thuốc đang dùng',
    icon: IconChecklist,
  },
  {
    step: '02',
    title: 'Đối chiếu 18 hoạt chất & 12 cặp',
    icon: IconDatabase,
  },
  {
    step: '03',
    title: 'Xem cảnh báo & hỏi dược sĩ',
    icon: IconMessageQuestion,
  },
];

function HeroSafetyPreview({ technicalMode }: { technicalMode: boolean }) {
  return (
    <div
      aria-label="Minh họa thẻ đối chiếu tách giờ của FamilyMed"
      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
        <span className="text-xs font-medium text-[#0F172A]">Ca mẫu: Levothyrox + Canxi D3</span>
        <span
          translate={technicalMode ? 'no' : undefined}
          className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#B45309]"
        >
          {technicalMode ? 'INT-09' : 'Cần tách giờ'}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs">
          <span className="font-medium text-[#0F172A]">Levothyroxine</span>
          <span className="font-mono text-[#0F766E]">
            {technicalMode ? 'DRUG-15' : 'Hormone tuyến giáp'}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs">
          <span className="font-medium text-[#0F172A]">Calcium + Vitamin D3</span>
          <span className="font-mono text-[#0F766E]">
            {technicalMode ? 'DRUG-16' : 'Canxi + Vitamin D3'}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#FDE68A] bg-white p-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-[#B45309]">
          <IconClock size={15} stroke={1.6} aria-hidden="true" />
          <span>Tách giờ uống ít nhất 4 giờ</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[#475569]">
          <span>Sáng: Levothyroxine</span>
          <span>Trưa: Canxi D3</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
        <span>Bản nháp xem trước</span>
        <Link to="/results/DEMO-B04" className="font-medium text-[#0F766E] hover:underline">
          Xem báo cáo mẫu
        </Link>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { technicalMode } = useTechnicalMode();
  const [showSafetyRules, setShowSafetyRules] = useState(false);
  const { userSessions, demoSessions } = medicationService.listSessions();
  const recentSessions = [...userSessions.slice(0, 2), ...demoSessions.slice(0, 3)].slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="max-w-lg text-balance text-2xl font-medium tracking-tight text-[#0F172A] sm:text-3xl">
              Chăm sóc thuốc cho người thân dễ dàng hơn
            </h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-[#475569] sm:text-base">
              Đối chiếu danh sách thuốc và nhận biết những trường hợp cần hỏi dược sĩ.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/checker"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0D645D]"
              >
                <span>Kiểm tra thuốc</span>
                <IconArrowRight size={16} stroke={1.6} aria-hidden="true" />
              </Link>
              <button
                type="button"
                aria-expanded={showSafetyRules}
                onClick={() => setShowSafetyRules((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
              >
                <IconInfoCircle size={16} stroke={1.6} className="text-[#475569]" aria-hidden="true" />
                <span>Cách hoạt động</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroSafetyPreview technicalMode={technicalMode} />
          </div>
        </div>

        {/* 3 Compact Steps */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-5 sm:grid-cols-3">
          {THREE_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F4F9] text-[#475569]">
                  <Icon size={16} stroke={1.6} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block font-mono text-xs text-[#64748B]">Bước {item.step}</span>
                  <span className="block text-sm font-medium text-[#0F172A]">{item.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        {showSafetyRules ? (
          <ul className="mt-4 list-disc space-y-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 pl-8 text-xs leading-relaxed text-[#334155]">
            <li>Chỉ đối chiếu trong 18 hoạt chất và 12 cặp tương tác mẫu; thuốc ngoài danh mục luôn đánh dấu chưa xác định.</li>
            <li>Khi có tương tác mức nghiêm trọng, hệ thống tạm chặn lịch uống hoàn chỉnh và tạo phiếu nháp hỏi dược sĩ.</li>
            <li>Mọi lịch uống chỉ là bản nháp tham khảo, không thay thế đơn bác sĩ hoặc tư vấn của dược sĩ.</li>
          </ul>
        ) : null}
      </section>

      {/* Recent Checks */}
      <section aria-labelledby="recent-checks-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 id="recent-checks-heading" className="text-balance text-base font-medium text-[#0F172A]">
            Lần kiểm tra gần đây
          </h2>
          <Link to="/history" className="text-xs font-medium text-[#0F766E] hover:underline">
            Xem tất cả
          </Link>
        </div>

        <div className="mt-4 divide-y divide-[#F1F4F9] rounded-xl border border-[#E2E8F0]">
          {recentSessions.map((session) => {
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
            return (
              <Link
                key={session.sessionId}
                to={`/results/${session.sessionId}`}
                className="flex flex-col justify-between gap-2 p-4 transition-colors hover:bg-[#F8FAFC] sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#0F172A]">
                      {session.profile.displayName || 'Người thân'}
                    </span>
                    <span className="rounded bg-[#F1F4F9] px-2 py-0.5 text-xs text-[#475569]">
                      {session.isDemoSession ? 'Dữ liệu mẫu' : 'Của bạn'}
                    </span>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {session.overview.totalMedications} thuốc · {formatDateTimeVi(session.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#64748B]">
                    {session.medications.map((m) => m.rawName).join(', ')}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <SeverityBadge severity={topSeverity} />
                  <IconArrowRight size={16} stroke={1.6} className="text-[#64748B]" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
