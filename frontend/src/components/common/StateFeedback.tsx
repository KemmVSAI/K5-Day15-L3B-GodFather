import type { ReactNode } from 'react';
import { IconAlertTriangle, IconInbox, IconLoader2, IconWifiOff } from '@tabler/icons-react';
import { cn } from '@/utils/cn';

export function LoadingPanel({
  title = 'Đang xử lý dữ liệu',
  description = 'Hệ thống đang đối chiếu thông tin thuốc theo danh mục hiện có.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <IconLoader2 size={28} stroke={1.6} className="animate-spin text-[#0F766E]" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-[#0F172A]">{title}</p>
      <p className="mt-1 max-w-md text-sm text-[#64748B]">{description}</p>
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F4F9] text-[#475569]">
        {icon ?? <IconInbox size={20} stroke={1.6} aria-hidden="true" />}
      </div>
      <h3 className="mt-3 text-sm font-medium text-[#0F172A]">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-[#64748B]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorPanel({
  title = 'Không thể tải dữ liệu',
  description,
  isOffline = false,
  onRetry,
  action,
  className,
}: {
  title?: string;
  description: string;
  isOffline?: boolean;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = isOffline ? IconWifiOff : IconAlertTriangle;
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-[#991B1B]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} stroke={1.6} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-[#991B1B]">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#7F1D1D]">{description}</p>
          {(onRetry || action) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-medium text-[#991B1B] transition-colors hover:bg-[#FEF2F2]"
                >
                  Thử lại
                </button>
              ) : null}
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
