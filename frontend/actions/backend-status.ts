import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getBackendStatus } from "../server/lib/medication-backend";

export default defineAction({
  description: "Đọc trạng thái backend Python và nguồn dữ liệu Thuốc Nhà.",
  schema: z.object({}),
  outputSchema: z.object({
    available: z.boolean(),
    demo_mode: z.boolean().optional(),
    drugs_count: z.number().optional(),
    interactions_count: z.number().optional(),
    sources: z.record(z.string(), z.string()).optional(),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async () => getBackendStatus(),
});
