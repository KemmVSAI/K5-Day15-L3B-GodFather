import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconHelpCircle,
  IconInfoCircle,
  IconMinus,
} from '@tabler/icons-react';
import type { InteractionSeverity } from '@/types/interaction';
import type { RecognitionStatus } from '@/types/medication';
import { cn } from '@/utils/cn';

const SEVERITY_CONFIG: Record<
  InteractionSeverity,
  { label: string; classes: string; icon: typeof IconAlertCircle }
> = {
  nang: {
    label: 'Nghiêm trọng',
    classes: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    icon: IconAlertCircle,
  },
  trung_binh: {
    label: 'Trung bình',
    classes: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    icon: IconAlertTriangle,
  },
  nhe: {
    label: 'Nhẹ',
    classes: 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]',
    icon: IconInfoCircle,
  },
  no_record: {
    label: 'Chưa ghi nhận tương tác',
    classes: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]',
    icon: IconMinus,
  },
  unknown: {
    label: 'Chưa xác định',
    classes: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
    icon: IconHelpCircle,
  },
};

export function SeverityBadge({ severity, className }: { severity: InteractionSeverity; className?: string }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium leading-4',
        cfg.classes,
        className,
      )}
    >
      <Icon size={14} stroke={1.6} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

const RECOGNITION_CONFIG: Record<RecognitionStatus, { label: string; classes: string; icon: typeof IconCheck }> = {
  idle: {
    label: 'Chưa đối chiếu',
    classes: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]',
    icon: IconMinus,
  },
  searching: {
    label: 'Đang tìm kiếm',
    classes: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
    icon: IconInfoCircle,
  },
  suggested: {
    label: 'Chờ xác nhận',
    classes: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    icon: IconAlertTriangle,
  },
  confirmed: {
    label: 'Đã xác nhận',
    classes: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    icon: IconCheck,
  },
  not_in_catalog: {
    label: 'Ngoài danh mục',
    classes: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
    icon: IconHelpCircle,
  },
};

export function RecognitionBadge({ status, className }: { status: RecognitionStatus; className?: string }) {
  const cfg = RECOGNITION_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium leading-4',
        cfg.classes,
        className,
      )}
    >
      <Icon size={14} stroke={1.6} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}
