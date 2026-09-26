/**
 * Minimal structured JSON logger (brain/22_OBSERVABILITY.md §4).
 * Stack traces go to server logs only — never to API responses.
 */
type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === "debug") write("debug", event, fields);
  },
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
