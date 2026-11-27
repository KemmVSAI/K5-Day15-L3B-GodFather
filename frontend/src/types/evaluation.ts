export interface AcceptanceCriterion {
  id: string;
  label: string;
  metricKey: string;
  threshold: string;
  description: string;
  isHardSafetyCondition: boolean;
}

export interface EvaluationMetricItem {
  key: string;
  label: string;
  valueLabel: string;
  targetLabel: string;
  status: 'empty' | 'pass' | 'fail' | 'monitor';
  note: string;
}

export interface BenchmarkCaseItem {
  id: string;
  input: string;
  expected: string;
  passCriterion: string;
  type: 'thuong' | 'kho' | 'tu_choi';
  source: string;
  status: 'not_run' | 'pass' | 'fail';
}

export interface CostSimulationRow {
  model: string;
  inputTokensAvg: number | null;
  outputTokensAvg: number | null;
  costPerRequestUsd: number | null;
  costPer100RequestsUsd: number | null;
  totalEvalCostUsd: number | null;
  pricingReference: string;
}

export interface EvaluationSnapshot {
  isMockPlaceholder: boolean;
  backendConnected: boolean;
  lastRunLabel: string;
  datasetScopeNote: string;
  acceptanceCriteria: AcceptanceCriterion[];
  summary: {
    totalCases: number;
    passedCases: number | null;
    failedCases: number | null;
    passRatePercent: number | null;
    hardSafetyPassPercent: number | null;
  };
  metrics: EvaluationMetricItem[];
  benchmarkCases: BenchmarkCaseItem[];
  costSimulation: {
    hasRunData: boolean;
    personasNote: string;
    rows: CostSimulationRow[];
  };
}
