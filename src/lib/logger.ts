/**
 * Structured JSON logger: timestamp, level, event, meta. Vercel ingests console output.
 * No external logging library. Use for all server-side events.
 */

type LogEvent =
  | { event: "ai.call.start"; function: string; sessionHash: string }
  | { event: "ai.call.success"; function: string; latencyMs: number; sessionHash: string; tokenUsage?: { prompt: number; completion: number }; responseCount?: number }
  | { event: "ai.call.failure"; function: string; errorType: string; sessionHash: string; retryCount?: number }
  | { event: "ai.validation.failure"; function: string; description: string; rawSnippet?: string }
  | { event: "session.created"; sessionHash: string; meetingType: string }
  | { event: "session.accessed"; sessionHash: string; route: string; expired: boolean }
  | { event: "mirror.response.submitted"; sessionHash: string; totalResponses: number }
  | { event: "ratelimit.hit"; endpoint: string; ipHash: string }
  | { event: "frame.created"; token: string; type: string; stakes: string }
  | { event: "frame.questions_generated"; token: string; durationMs: number }
  | { event: "frame.brief_generated"; token: string; durationMs: number }
  | { event: "frame.viewed"; token: string; isOwner: boolean }
  | { event: "mirror.created"; mtoken: string; frameToken?: string }
  | { event: "mirror.response_submitted"; mtoken: string; responseNumber: number }
  | { event: "mirror.overlay_generated"; mtoken: string; responseCount: number; durationMs: number }
  | { event: "ai.error"; function: string; error: string; token?: string }
  | { event: "token.expired_access"; token: string; route: string };

function levelFor(event: LogEvent["event"]): "info" | "error" {
  const err: LogEvent["event"][] = ["ai.call.failure", "ai.validation.failure", "ai.error", "ratelimit.hit"];
  return err.includes(event) ? "error" : "info";
}

export function log(entry: LogEvent): void {
  const { event, ...rest } = entry;
  const line = {
    timestamp: new Date().toISOString(),
    level: levelFor(event),
    event,
    meta: rest,
  };
  (line.level === "error" ? console.error : console.log)(JSON.stringify(line));
}
