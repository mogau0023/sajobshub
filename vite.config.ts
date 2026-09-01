import { loadEnv, mergeConfig, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { devtools } from "@tanstack/devtools-vite";

export default async (env: {
  command: "build" | "serve";
  mode: string;
  isPreview?: boolean;
}): Promise<UserConfig> => {
  const { command, mode } = env;

  const internalPlugins: UserConfig["plugins"] = [];

  if (mode === "development") {
    internalPlugins.push(
      devtools({
        logging: false,
        eventBusConfig: { enabled: false },
        enhancedLogs: { enabled: false },
        consolePiping: { enabled: false },
        removeDevtoolsOnBuild: false,
        injectSource: { enabled: true },
      }),
    );
  }

  internalPlugins.push(tailwindcss());
  internalPlugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));

  const tanstackStartOptions = mergeConfig(
    {
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
    },
    {},
  );
  internalPlugins.push(tanstackStart(tanstackStartOptions));

  if (command === "build") {
    try {
      const { nitro } = await import("nitro/vite");
      const isVercel = Boolean(
        process.env["VERCEL"] || process.env["VERCEL_ENV"] || process.env["CI"]?.includes("vercel"),
      );
      const preset = isVercel ? "vercel" : "cloudflare-module";
      // eslint-disable-next-line no-console
      console.log(`\n[tanstack-start] Using Nitro preset: ${preset} (isVercel=${isVercel})`);
      const nitroOptions: Record<string, unknown> = { preset };
      if (isVercel) {
        // Nitro's "vercel" preset generates .vercel/output automatically
        nitroOptions["output"] = { dir: ".vercel/output" };
      } else {
        nitroOptions["output"] = {
          dir: "dist",
          serverDir: "dist/server",
          publicDir: "dist/client",
        };
        nitroOptions["cloudflare"] = { nodeCompat: true, deployConfig: true };
      }
      internalPlugins.push(nitro(nitroOptions));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[tanstack-start] Nitro plugin not loaded:", (err as Error).message);
    }
  }

  internalPlugins.push(viteReact());

  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const isDevBuild = command === "build" && mode === "development";

  return {
    define: envDefine,
    ...(isDevBuild
      ? ({
          environments: {
            client: {
              define: { "process.env.NODE_ENV": JSON.stringify("development") },
            },
          },
          esbuild: { keepNames: true },
        } as UserConfig)
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: internalPlugins,
  };
};
