type LogEvent =
  | { event: "frame.created"; token: string; type: string; stakes: string }
  | { event: "frame.questions_generated"; token: string; durationMs: number }
  | { event: "frame.brief_generated"; token: string; durationMs: number }
  | { event: "frame.viewed"; token: string; isOwner: boolean }
  | { event: "mirror.created"; mtoken: string; frameToken: string }
  | { event: "mirror.response_submitted"; mtoken: string; responseNumber: number }
  | { event: "mirror.overlay_generated"; mtoken: string; responseCount: number; durationMs: number }
  | { event: "ai.error"; function: string; error: string; token?: string }
  | { event: "token.expired_access"; token: string; route: string };

/** Emits a structured JSON log line captured by Vercel's log drain. */
export function log(entry: LogEvent): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
}
