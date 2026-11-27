import { useEffect, useState } from 'react';
import { IconCheck, IconCopy, IconFileText, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { SeverityBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import type { PharmacistHandoffDraft } from '@/types/interaction';

interface PharmacistHandoffModalProps {
  open: boolean;
  draft: PharmacistHandoffDraft;
  onClose: () => void;
}

export function PharmacistHandoffModal({ open, draft, onClose }: PharmacistHandoffModalProps) {
  const [copied, setCopied] = useState(false);
  const { technicalMode } = useTechnicalMode();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft.plainTextSummary);
      setCopied(true);
      toast.success('Đã sao chép bản nháp hỏi dược sĩ');
      setTimeout(() => setCopied(false), 2400);
    } catch {
      toast.error('Trình duyệt không cho phép tự sao chép. Hãy chọn văn bản và nhấn Ctrl+C.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-modal-title"
    >
      <div className="fixed inset-0 bg-[#0F172A]/45" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden overscroll-contain rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-medium text-[#B45309]">
                Bản nháp tự sao chép
              </span>
              {technicalMode ? (
                <span translate="no" className="font-mono text-xs text-[#64748B]">
                  {draft.draftId}
                </span>
              ) : null}
            </div>
            <h2 id="handoff-modal-title" className="mt-2 text-lg font-medium text-[#0F172A]">
              Nội dung chuẩn bị hỏi dược sĩ
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Hệ thống không tự gửi thông tin đi đâu. Bạn kiểm tra lại rồi sao chép để mang ra nhà thuốc hoặc nhắn cho dược sĩ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F4F9] sm:h-9 sm:w-9"
          >
            <IconX size={18} stroke={1.6} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <section>
            <h3 className="text-xs font-medium text-[#475569]">1. Danh sách thuốc đang dùng</h3>
            <ul className="mt-2 divide-y divide-[#F1F4F9] rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              {draft.medications.map((med, idx) => (
                <li key={idx} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="font-medium text-[#0F172A]">
                    {med.displayName}
                    {med.strength ? <span className="ml-2 text-xs font-normal text-[#64748B]">{med.strength}</span> : null}
                  </div>
                  <span className="text-xs text-[#475569]">
                    {med.inCatalog
                      ? technicalMode && med.code
                        ? `${med.code} · ${med.genericName}`
                        : `Hoạt chất: ${med.genericName}`
                      : 'Chưa có trong danh mục'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-medium text-[#475569]">2. Các cảnh báo được hệ thống tìm thấy</h3>
            {draft.foundWarnings.length === 0 ? (
              <p className="mt-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
                Không ghi nhận cảnh báo trong phạm vi 12 cặp tương tác mẫu hiện có.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {draft.foundWarnings.map((warn) => (
                  <div key={`${warn.code}-${warn.pair}`} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#0F172A]">
                        {technicalMode ? (
                          <span translate="no" className="mr-1.5 font-mono text-xs text-[#64748B]">
                            [{warn.code}]
                          </span>
                        ) : null}
                        {warn.pair}
                      </span>
                      <SeverityBadge severity={warn.severity} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#475569]">{warn.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h3 className="text-xs font-medium text-[#475569]">3. Thuốc chưa xác định trong dữ liệu</h3>
              {draft.unknownMedications.length === 0 ? (
                <p className="mt-2 text-xs text-[#64748B]">Tất cả thuốc đã đối chiếu được vào 18 hoạt chất hỗ trợ.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#0F172A]">
                  {draft.unknownMedications.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h3 className="text-xs font-medium text-[#475569]">4. Thông tin còn thiếu cần đối chiếu</h3>
              {draft.missingInformation.length === 0 ? (
                <p className="mt-2 text-xs text-[#64748B]">Không có thông tin thiếu.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#0F172A]">
                  {draft.missingInformation.map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section>
            <h3 className="text-xs font-medium text-[#475569]">5. Câu hỏi gợi ý để trao đổi với dược sĩ</h3>
            <ol className="mt-2 list-decimal space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 pl-8 text-sm text-[#0F172A]">
              {draft.suggestedQuestions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
              <IconFileText size={16} stroke={1.6} aria-hidden="true" />
              <span>Văn bản đầy đủ khi sao chép</span>
            </div>
            <pre className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#334155]">
              {draft.plainTextSummary}
            </pre>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-xs text-[#64748B]">Bản tóm tắt sẵn sàng sao chép · Không tự gửi</span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-medium text-[#475569] transition-colors hover:bg-[#F1F4F9] sm:min-h-0 sm:h-10"
            >
              Đóng bản nháp
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#0F766E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0D645D] sm:min-h-0 sm:h-10"
            >
              {copied ? (
                <IconCheck size={16} stroke={1.6} aria-hidden="true" />
              ) : (
                <IconCopy size={16} stroke={1.6} aria-hidden="true" />
              )}
              <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
