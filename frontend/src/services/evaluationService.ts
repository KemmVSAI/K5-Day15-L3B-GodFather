import { INITIAL_EVALUATION_SNAPSHOT } from '@/mocks/evaluationData';
import type { EvaluationSnapshot } from '@/types/evaluation';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';

export const evaluationService = {
  async getMetrics(): Promise<EvaluationSnapshot> {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/evaluation/metrics`);
        if (!res.ok) {
          throw new Error('Không thể tải dữ liệu đánh giá từ backend.');
        }
        return (await res.json()) as EvaluationSnapshot;
      } catch {
        throw new Error('Backend đánh giá chưa sẵn sàng (API unavailable).');
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 180));
    return INITIAL_EVALUATION_SNAPSHOT;
  },
};
