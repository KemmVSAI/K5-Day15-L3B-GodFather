import type { AIExplanationBlocks } from '@/types/interaction';

export function AiExplanationSection({ explanation }: { explanation: AIExplanationBlocks }) {
  const blocks = [
    {
      title: 'Đã kiểm tra',
      content: explanation.whatSystemChecked,
      tag: 'Từ dữ liệu',
      isData: true,
    },
    {
      title: 'Cảnh báo đáng chú ý',
      content: explanation.whatWasFound,
      tag: 'Từ dữ liệu',
      isData: true,
    },
    {
      title: 'Giới hạn dữ liệu',
      content: explanation.dataLimitations,
      tag: 'Phạm vi dữ liệu',
      isData: false,
    },
    {
      title: 'Bước tiếp theo',
      content: explanation.whatToDoNext,
      tag: explanation.isMockResponse ? 'Diễn giải mẫu' : 'Diễn giải AI',
      isData: false,
    },
  ];

  return (
    <section aria-labelledby="ai-explanation-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
      <h2 id="ai-explanation-heading" className="text-base font-medium text-[#0F172A] sm:text-lg">
        Điều cần lưu ý
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-[#0F172A]">{block.title}</h3>
              <span
                className={
                  block.isData
                    ? 'rounded border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 text-xs font-medium text-[#0F766E]'
                    : 'rounded border border-[#CBD5E1] bg-white px-2 py-0.5 text-xs font-medium text-[#475569]'
                }
              >
                {block.tag}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#334155]">{block.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
