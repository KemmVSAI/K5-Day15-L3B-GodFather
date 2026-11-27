import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/components/common/StateFeedback';
import { evaluationService } from '@/services/evaluationService';
import type { BenchmarkCaseItem, EvaluationSnapshot } from '@/types/evaluation';
import { cn } from '@/utils/cn';

type CaseFilter = 'all' | 'thuong' | 'kho' | 'tu_choi';

const TYPE_LABELS: Record<BenchmarkCaseItem['type'], { label: string; classes: string }> = {
  thuong: { label: 'Thường', classes: 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]' },
  kho: { label: 'Khó', classes: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' },
  tu_choi: { label: 'Từ chối', classes: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' },
};

const METRIC_TITLES: Record<string, string> = {
  nang_khong_lo: 'Phát hiện tương tác nặng',
  thuoc_la_khong_bia: 'Thuốc ngoài dữ liệu',
  tu_choi_dung: 'Từ chối ngoài phạm vi',
  chuyen_thua: 'Chuyển dược sĩ thừa',
  lich_dung_gio: 'Khớp khung giờ uống',
};

export function EvaluationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<EvaluationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const rawType = searchParams.get('type') as CaseFilter | null;
  const caseFilter: CaseFilter =
    rawType === 'thuong' || rawType === 'kho' || rawType === 'tu_choi' ? rawType : 'all';
  const setCaseFilter = (next: CaseFilter) => {
    setSearchParams(next === 'all' ? {} : { type: next }, { replace: true });
  };

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluationService.getMetrics();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  if (loading) {
    return <LoadingPanel title="Đang tải dữ liệu đánh giá…" />;
  }

  if (error) {
    return <ErrorPanel title="Chưa thể kết nối nguồn đánh giá" description={error} isOffline onRetry={loadSnapshot} />;
  }

  if (!snapshot) {
    return (
      <EmptyPanel
        title="Chưa có dữ liệu đánh giá"
        description="Chưa có kết quả eval/run-N.csv hoặc cost/simulate-N.csv."
      />
    );
  }

  const filteredCases =
    caseFilter === 'all' ? snapshot.benchmarkCases : snapshot.benchmarkCases.filter((c) => c.type === caseFilter);

  return (
    <div className="space-y-6">
      {/* Top Status & Summary */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#64748B]">{snapshot.lastRunLabel}</span>
          <span className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-medium text-[#B45309]">
            {snapshot.backendConnected ? 'Đã kết nối backend' : 'Chưa nối run-N.csv thật'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs text-[#64748B]">Câu thử</p>
            <p className="mt-1.5 text-2xl font-medium text-[#0F172A] tabular-nums">{snapshot.summary.totalCases}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs text-[#64748B]">Đạt / Trượt</p>
            <p className="mt-1.5 text-2xl font-medium text-[#475569] tabular-nums">
              {snapshot.summary.passedCases ?? '—'} / {snapshot.summary.failedCases ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs text-[#64748B]">Pass rate</p>
            <p className="mt-1.5 text-2xl font-medium text-[#475569] tabular-nums">
              {snapshot.summary.passRatePercent !== null ? `${snapshot.summary.passRatePercent}%` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs text-[#64748B]">Ngưỡng an toàn cứng</p>
            <p className="mt-1.5 text-2xl font-medium text-[#0F766E] tabular-nums">100%</p>
          </div>
        </div>
      </section>

      {/* Acceptance Criteria */}
      <section aria-labelledby="acceptance-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h2 id="acceptance-heading" className="text-base font-medium text-[#0F172A]">
          Tiêu chuẩn chấp nhận
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {snapshot.acceptanceCriteria.map((criterion) => (
            <div
              key={criterion.id}
              className={cn(
                'rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4',
                criterion.isHardSafetyCondition ? 'border-l-4 border-l-[#0F766E]' : '',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span translate="no" className="font-mono text-xs font-medium text-[#0F766E]">
                  {criterion.id}
                </span>
                <span className="rounded border border-[#E2E8F0] bg-white px-2 py-0.5 font-mono text-xs font-medium text-[#0F172A]">
                  {criterion.threshold}
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-medium text-[#0F172A]">{criterion.label}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section aria-labelledby="metrics-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h2 id="metrics-heading" className="text-base font-medium text-[#0F172A]">
          Chỉ số đánh giá
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.metrics.map((metric) => {
            const isOpen = expandedMetric === metric.key;
            return (
              <div key={metric.key} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#0F172A]">
                      {METRIC_TITLES[metric.key] ?? metric.label}
                    </h3>
                    <span translate="no" className="font-mono text-xs text-[#64748B]">
                      {metric.key}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpandedMetric(isOpen ? null : metric.key)}
                    className="inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A]"
                  >
                    <span>Định nghĩa</span>
                    {isOpen ? (
                      <IconChevronUp size={14} stroke={1.6} aria-hidden="true" />
                    ) : (
                      <IconChevronDown size={14} stroke={1.6} aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-base font-medium text-[#475569] tabular-nums">
                    {metric.valueLabel}
                  </span>
                  <span className="text-xs font-medium text-[#0F766E]">{metric.targetLabel}</span>
                </div>

                {isOpen ? <p className="mt-2 text-xs leading-relaxed text-[#64748B]">{metric.note}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Benchmark Cases */}
      <section aria-labelledby="benchmark-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="benchmark-heading" className="text-base font-medium text-[#0F172A]">
            Bộ câu thử (<span className="tabular-nums">{filteredCases.length}</span>)
          </h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc loại câu thử">
            {(
              [
                { key: 'all', label: 'Tất cả (13)' },
                { key: 'thuong', label: 'Thường (3)' },
                { key: 'kho', label: 'Khó (7)' },
                { key: 'tu_choi', label: 'Từ chối (3)' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCaseFilter(item.key)}
                className={cn(
                  'h-8 rounded-lg px-3 text-xs font-medium transition-colors',
                  caseFilter === item.key
                    ? 'bg-[#0F766E] text-white'
                    : 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F4F9]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="mt-4 space-y-2 md:hidden">
          {filteredCases.map((row) => {
            const typeCfg = TYPE_LABELS[row.type];
            return (
              <div key={row.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span translate="no" className="font-mono font-medium text-[#0F172A]">
                    {row.id}
                  </span>
                  <span className={cn('rounded border px-2 py-0.5 font-medium', typeCfg.classes)}>
                    {typeCfg.label}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-[#0F172A]">{row.input}</p>
                <p className="mt-1 text-[#64748B]">{row.passCriterion}</p>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-[#E2E8F0] md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Đầu vào mẫu</th>
                <th className="px-4 py-3 font-medium">Tiêu chí đạt</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F4F9] bg-white">
              {filteredCases.map((row) => {
                const typeCfg = TYPE_LABELS[row.type];
                return (
                  <tr key={row.id} className="align-top hover:bg-[#F8FAFC]">
                    <td translate="no" className="px-4 py-3 font-mono font-medium text-[#0F172A]">
                      {row.id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium',
                          typeCfg.classes,
                        )}
                      >
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 leading-relaxed text-[#0F172A]">{row.input}</td>
                    <td className="max-w-sm px-4 py-3 leading-relaxed text-[#475569]">{row.passCriterion}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[#64748B]">
                      {row.status === 'not_run' ? 'Chưa chạy' : row.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cost Simulation */}
      <section aria-labelledby="cost-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="cost-heading" className="text-base font-medium text-[#0F172A]">
            Mô phỏng chi phí
          </h2>
          <span className="text-xs text-[#64748B]">Chưa có dữ liệu từ `python run.py simulate`</span>
        </div>

        {/* Mobile Cards */}
        <div className="mt-4 space-y-2 md:hidden">
          {snapshot.costSimulation.rows.map((row) => (
            <div key={row.model} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
              <p className="font-medium text-[#0F172A]">{row.model}</p>
              <p className="mt-1 text-[#64748B]">{row.pricingReference}</p>
              <p className="mt-2 font-mono text-[#64748B]">Token & chi phí: Chưa đo</p>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-[#E2E8F0] md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
                <th className="px-4 py-3 font-medium">Model / Provider</th>
                <th className="px-4 py-3 font-medium">Input tokens</th>
                <th className="px-4 py-3 font-medium">Output tokens</th>
                <th className="px-4 py-3 font-medium">Chi phí / lượt</th>
                <th className="px-4 py-3 font-medium">Chi phí / 100 lượt</th>
                <th className="px-4 py-3 font-medium">Tổng eval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F4F9] bg-white">
              {snapshot.costSimulation.rows.map((row) => (
                <tr key={row.model}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0F172A]">{row.model}</p>
                    <p className="mt-0.5 text-[#64748B]">{row.pricingReference}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">Chưa đo</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">Chưa đo</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">Chưa đo</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">Chưa đo</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">Chưa đo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
