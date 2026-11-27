import { IconShieldCheck } from '@tabler/icons-react';
import { cn } from '@/utils/cn';

export function SafetyDisclaimerBanner({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#E2E8F0] bg-white text-[#475569]',
        compact ? 'px-4 py-3 text-xs' : 'p-4 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <IconShieldCheck size={18} stroke={1.6} className="mt-0.5 shrink-0 text-[#475569]" aria-hidden="true" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-medium text-[#0F172A]">
            Công cụ hỗ trợ sắp xếp thông tin thuốc — không thay thế bác sĩ hoặc dược sĩ
          </p>
          <p>
            FamilyMed không chẩn đoán bệnh, không kê đơn và không tư vấn thay đổi liều dùng. Dữ liệu hiện tại là tập mẫu thử nghiệm gồm 18 hoạt chất và 12 cặp tương tác.
          </p>
        </div>
      </div>
    </div>
  );
}
