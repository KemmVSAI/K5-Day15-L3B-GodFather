import { useState } from 'react';
import { IconCode } from '@tabler/icons-react';
import type { TechnicalTrace } from '@/types/interaction';
import { cn } from '@/utils/cn';

const STEP_STATUS_LABELS: Record<
  TechnicalTrace['steps'][number]['status'],
  { label: string; classes: string }
> = {
  completed: { label: 'Completed', classes: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' },
  blocked: { label: 'Safety Blocked', classes: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' },
  mocked: { label: 'Mock Mode', classes: 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]' },
};

export function TechnicalTracePanel({ trace }: { trace: TechnicalTrace }) {
  const [showRawJson, setShowRawJson] = useState(false);

  return (
    <section
      aria-labelledby="technical-trace-heading"
      className="rounded-2xl border border-[#CBD5E1] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
        <div>
          <h2 id="technical-trace-heading" className="text-base font-medium text-[#0F172A]">
            Chế độ kỹ thuật — Execution Trace
          </h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Trạng thái bước xử lý, safety flags, rule IDs và telemetry của phiên chạy hiện tại
          </p>
        </div>

        <button
          type="button"
          aria-expanded={showRawJson}
          onClick={() => setShowRawJson((v) => !v)}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
        >
          <IconCode size={15} stroke={1.6} aria-hidden="true" />
          <span>{showRawJson ? 'Ẩn JSON' : 'Structured JSON'}</span>
        </button>
      </div>

      {/* 1. Workflow Execution Steps */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[600px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
              <th className="px-4 py-2.5 font-medium">Workflow</th>
              <th className="px-4 py-2.5 font-medium">Thành phần</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 font-medium">Kết quả bước</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {trace.steps.map((step) => {
              const badge = STEP_STATUS_LABELS[step.status];
              return (
                <tr key={step.workflow} className="align-top">
                  <td translate="no" className="px-4 py-3 font-mono font-medium text-[#0F172A]">
                    {step.workflow}
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{step.component}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('rounded border px-2 py-0.5 font-mono text-xs', badge.classes)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#334155]">{step.summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Safety Flags */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
          <span className="block font-mono text-[#64748B]">allow_schedule</span>
          <span translate="no" className="mt-1 block font-mono text-sm font-medium text-[#0F172A]">
            {String(trace.structuredOutput.allow_schedule)}
          </span>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
          <span className="block font-mono text-[#64748B]">has_unmapped</span>
          <span translate="no" className="mt-1 block font-mono text-sm font-medium text-[#0F172A]">
            {String(trace.structuredOutput.has_unmapped)}
          </span>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
          <span className="block font-mono text-[#64748B]">severity_max</span>
          <span translate="no" className="mt-1 block font-mono text-sm font-medium text-[#0F172A]">
            {trace.structuredOutput.severity_max}
          </span>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
          <span className="block font-mono text-[#64748B]">requires_pharmacist</span>
          <span translate="no" className="mt-1 block font-mono text-sm font-medium text-[#0F172A]">
            {String(trace.structuredOutput.requires_pharmacist)}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
        <span className="font-mono font-medium text-[#475569]">triggered_rules: </span>
        <span translate="no" className="font-mono text-[#0F172A]">
          {trace.structuredOutput.triggered_rules.length > 0
            ? trace.structuredOutput.triggered_rules.join(', ')
            : 'none'}
        </span>
      </div>

      {showRawJson ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-[#E2E8F0] bg-[#0F172A] p-4 font-mono text-xs leading-relaxed text-[#E2E8F0]">
          {JSON.stringify(trace.structuredOutput, null, 2)}
        </pre>
      ) : null}

      {/* 3. Telemetry */}
      <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium text-[#0F172A]">Telemetry phiên chạy</h3>
          {!trace.telemetry ? (
            <span className="rounded border border-[#CBD5E1] bg-white px-2.5 py-0.5 font-mono text-xs text-[#64748B]">
              Chưa có telemetry cho phiên này
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <span className="block text-[#64748B]">Provider</span>
            <span className="mt-0.5 block font-mono text-[#0F172A]">{trace.telemetry?.provider ?? '—'}</span>
          </div>
          <div>
            <span className="block text-[#64748B]">Model</span>
            <span className="mt-0.5 block font-mono text-[#0F172A]">{trace.telemetry?.model ?? '—'}</span>
          </div>
          <div>
            <span className="block text-[#64748B]">Input tokens</span>
            <span className="mt-0.5 block font-mono text-[#0F172A] tabular-nums">
              {trace.telemetry?.inputTokens ?? '—'}
            </span>
          </div>
          <div>
            <span className="block text-[#64748B]">Output tokens</span>
            <span className="mt-0.5 block font-mono text-[#0F172A] tabular-nums">
              {trace.telemetry?.outputTokens ?? '—'}
            </span>
          </div>
          <div>
            <span className="block text-[#64748B]">Latency</span>
            <span className="mt-0.5 block font-mono text-[#0F172A] tabular-nums">
              {trace.telemetry?.latencyMs !== null && trace.telemetry?.latencyMs !== undefined
                ? `${trace.telemetry.latencyMs} ms`
                : '—'}
            </span>
          </div>
          <div>
            <span className="block text-[#64748B]">Estimated cost</span>
            <span className="mt-0.5 block font-mono text-[#0F172A] tabular-nums">
              {trace.telemetry?.estimatedCostUsd !== null && trace.telemetry?.estimatedCostUsd !== undefined
                ? `$${trace.telemetry.estimatedCostUsd.toFixed(6)}`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
