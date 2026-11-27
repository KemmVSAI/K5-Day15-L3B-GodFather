import { RecognitionBadge } from '@/components/common/StatusBadge';
import { useTechnicalMode } from '@/contexts/TechnicalModeContext';
import type { MedicationInputItem } from '@/types/medication';

export function MedicationNormalizationTable({ medications }: { medications: MedicationInputItem[] }) {
  const { technicalMode } = useTechnicalMode();

  return (
    <section aria-labelledby="norm-table-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <h2 id="norm-table-heading" className="text-base font-medium text-[#0F172A]">
        Đối chiếu hoạt chất
      </h2>

      {/* Desktop Table */}
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-[#E2E8F0] md:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
              <th className="px-4 py-3 font-medium">Tên người dùng nhập</th>
              <th className="px-4 py-3 font-medium">Hoạt chất nhận diện</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {medications.map((med) => (
              <tr key={med.id}>
                <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                  {med.rawName}
                  {med.strength ? <span className="ml-2 text-xs font-normal text-[#64748B]">{med.strength}</span> : null}
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">
                  {med.matchedGenericName ? (
                    <span className="inline-flex items-center gap-2">
                      {technicalMode && med.matchedDrugCode ? (
                        <span
                          translate="no"
                          className="rounded bg-[#F0FDFA] px-1.5 py-0.5 font-mono text-xs font-medium text-[#0F766E]"
                        >
                          {med.matchedDrugCode}
                        </span>
                      ) : null}
                      <span>{med.matchedGenericName}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#64748B]">Chưa có trong danh mục 18 hoạt chất</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RecognitionBadge status={med.recognitionStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mt-3 space-y-2 md:hidden">
        {medications.map((med) => (
          <div key={med.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0F172A]">
                {med.rawName}
                {med.strength ? <span className="ml-1.5 text-xs font-normal text-[#64748B]">{med.strength}</span> : null}
              </p>
              <p className="mt-0.5 text-[#64748B]">
                {med.matchedGenericName
                  ? technicalMode && med.matchedDrugCode
                    ? `${med.matchedDrugCode} · ${med.matchedGenericName}`
                    : med.matchedGenericName
                  : 'Ngoài danh mục'}
              </p>
            </div>
            <RecognitionBadge status={med.recognitionStatus} />
          </div>
        ))}
      </div>
    </section>
  );
}
