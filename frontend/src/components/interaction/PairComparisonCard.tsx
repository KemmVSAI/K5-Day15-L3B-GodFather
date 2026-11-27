import { useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { SeverityBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import type { PairComparisonItem } from '@/types/interaction';
import { cn } from '@/utils/cn';

const CARD_LEFT_ACCENT: Record<PairComparisonItem['severity'], string> = {
  nang: 'border-l-4 border-l-[#DC2626]',
  trung_binh: 'border-l-4 border-l-[#D97706]',
  nhe: 'border-l-4 border-l-[#0284C7]',
  no_record: '',
  unknown: 'border-l-4 border-l-[#94A3B8]',
};

const USER_VERIFICATION_LABEL: Record<PairComparisonItem['verificationStatus'], string> = {
  interaction_found: 'Có dữ liệu tương tác',
  no_interaction_record: 'Chưa ghi nhận cảnh báo trong dữ liệu',
  not_covered: 'Ngoài phạm vi 18 thuốc hỗ trợ',
  unknown_medication: 'Thuốc chưa xác định',
};

const TECHNICAL_VERIFICATION_LABEL: Record<PairComparisonItem['verificationStatus'], string> = {
  interaction_found: 'Interaction Found · Có bản ghi tương tác',
  no_interaction_record: 'No Interaction Record · Chưa ghi nhận trong dữ liệu',
  not_covered: 'Not Covered · Ngoài phạm vi 18 hoạt chất',
  unknown_medication: 'Unknown Medication · Thuốc chưa xác định',
};

function stripLeadingInteractionCode(sourceInfo: string): string {
  return sourceInfo.replace(/^INT-\d+\s*·\s*/i, '');
}

export function PairComparisonCard({ item }: { item: PairComparisonItem }) {
  const [expanded, setExpanded] = useState(item.severity === 'nang');
  const { technicalMode } = useTechnicalMode();

  const verificationLabel = technicalMode
    ? TECHNICAL_VERIFICATION_LABEL[item.verificationStatus]
    : USER_VERIFICATION_LABEL[item.verificationStatus];

  const sourceText = technicalMode ? item.sourceInfo : stripLeadingInteractionCode(item.sourceInfo);

  return (
    <article
      className={cn(
        'rounded-xl border border-[#E2E8F0] bg-white p-4',
        CARD_LEFT_ACCENT[item.severity],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {technicalMode && item.interactionCode ? (
              <span
                translate="no"
                className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-xs text-[#475569]"
              >
                {item.interactionCode}
              </span>
            ) : null}
            <h3 className="text-sm font-medium text-[#0F172A] sm:text-base">
              {item.drugAName} <span className="font-normal text-[#64748B]">+</span> {item.drugBName}
            </h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#334155]">{item.dataDescription}</p>
        </div>

        <SeverityBadge severity={item.severity} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F4F9] pt-2 sm:pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
          <span>{verificationLabel}</span>
          {item.action === 'tach_gio' ? (
            <span className="whitespace-nowrap rounded border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 font-medium text-[#0F766E]">
              Tách giờ uống
            </span>
          ) : item.action === 'hoi_duoc_si' ? (
            <span className="whitespace-nowrap rounded border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 font-medium text-[#B91C1C]">
              Hỏi dược sĩ
            </span>
          ) : null}
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-[#0F766E] hover:underline sm:min-h-0 sm:px-0"
        >
          <span>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
          {expanded ? (
            <IconChevronUp size={14} stroke={1.6} aria-hidden="true" />
          ) : (
            <IconChevronDown size={14} stroke={1.6} aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 rounded-lg bg-[#F8FAFC] p-3 text-xs leading-relaxed">
          <p className="text-sm text-[#0F172A]">{item.plainExplanation}</p>
          <p className="text-[#64748B]">Nguồn &amp; giới hạn đối chiếu: {sourceText}</p>
        </div>
      ) : null}
    </article>
  );
}
