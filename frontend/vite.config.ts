import { agentNative } from "@agent-native/core/vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";
import fs from "node:fs";

const reactRouterPlugins = reactRouter as unknown as () => any[];
const agentNativePlugins = agentNative as unknown as (
  options?: Parameters<typeof agentNative>[0],
) => any[];
export default defineConfig({
  optimizeDeps: {
    entries: [
      "app/entry.client.tsx",
      "app/root.tsx",
      "app/components/layout/{Layout,Sidebar}.tsx",
      "app/components/chat/ChatRouteContent.tsx",
      "app/routes/{home,chat.$threadId}.tsx",
    ],
  },
  plugins: [
    {
      name: "familymed-app-alias",
      resolveId(source) {
        if (!source.startsWith("@/")) return null;
        const relativePath = source.slice(2);
        for (const base of [
          path.resolve(__dirname, "./app"),
          path.resolve(__dirname, "./src"),
        ]) {
          const target = path.resolve(base, relativePath);
          if (fs.existsSync(target)) return target;
          for (const extension of [".ts", ".tsx", ".js", ".jsx"]) {
            if (fs.existsSync(`${target}${extension}`)) return `${target}${extension}`;
          }
          if (fs.existsSync(path.join(target, "index.ts"))) return path.join(target, "index.ts");
          if (fs.existsSync(path.join(target, "index.tsx"))) return path.join(target, "index.tsx");
        }
        return null;
      },
    },
    ...reactRouterPlugins(),
    tailwindcss(),
    ...agentNativePlugins({
      ssrStubs: ["shiki"],
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
