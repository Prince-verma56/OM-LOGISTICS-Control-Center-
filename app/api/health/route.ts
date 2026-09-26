import { getRepositories } from "@/data/repositories";
import { getAppConfig } from "@/lib/config/app";
import { withApi } from "@/lib/server/api-handler";

/** GET /api/health — liveness + data-source summary (brain/22 §5). */
export const GET = withApi(async () => {
  const config = getAppConfig();
  const repos = getRepositories();
  return {
    status: "ok",
    demoMode: config.demoMode,
    dataSource: repos.source,
    simulatedNow: repos.clock.now().toISOString(),
    time: new Date().toISOString(),
  };
});
