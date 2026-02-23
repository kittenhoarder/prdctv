import { describe, it, expect, vi, afterEach } from "vitest";
import { ModelHealthTracker } from "./model-health";

describe("ModelHealthTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats unseen models as healthy", () => {
    const tracker = new ModelHealthTracker();
    expect(tracker.isHealthy("never-seen")).toBe(true);
  });

  it("remains healthy within grace period despite failures", () => {
    const tracker = new ModelHealthTracker();
    tracker.recordFailure("model-a");
    tracker.recordFailure("model-a");
    // 2 failures < 3 grace period requests
    expect(tracker.isHealthy("model-a")).toBe(true);
  });

  it("marks model unhealthy when success rate drops below 50%", () => {
    const tracker = new ModelHealthTracker();
    // 1 success, 3 failures → 25% success rate (past grace period)
    tracker.recordSuccess("model-a", 100);
    tracker.recordFailure("model-a");
    tracker.recordFailure("model-a");
    tracker.recordFailure("model-a");
    expect(tracker.isHealthy("model-a")).toBe(false);
  });

  it("stays healthy at exactly 50% success rate", () => {
    const tracker = new ModelHealthTracker();
    tracker.recordSuccess("model-a", 100);
    tracker.recordSuccess("model-a", 100);
    tracker.recordFailure("model-a");
    tracker.recordFailure("model-a");
    expect(tracker.isHealthy("model-a")).toBe(true);
  });

  it("marks rate-limited model as unhealthy during cooldown", () => {
    const tracker = new ModelHealthTracker();
    tracker.recordRateLimit("model-a");
    expect(tracker.isHealthy("model-a")).toBe(false);
  });

  it("restores health after rate-limit cooldown expires", () => {
    const tracker = new ModelHealthTracker();
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now);
    tracker.recordRateLimit("model-a");
    expect(tracker.isHealthy("model-a")).toBe(false);

    // Fast-forward past 10-minute cooldown
    vi.spyOn(Date, "now").mockReturnValue(now + 11 * 60 * 1000);
    // Still has the failure from recordRateLimit, but within grace period (only 1 outcome)
    expect(tracker.isHealthy("model-a")).toBe(true);
  });

  it("marks incompatible model as permanently unhealthy", () => {
    const tracker = new ModelHealthTracker();
    tracker.markIncompatible("model-a");
    expect(tracker.isHealthy("model-a")).toBe(false);
  });

  it("tracks average latency", () => {
    const tracker = new ModelHealthTracker();
    tracker.recordSuccess("model-a", 100);
    tracker.recordSuccess("model-a", 200);
    tracker.recordSuccess("model-a", 300);
    expect(tracker.getAverageLatency("model-a")).toBe(200);
  });

  it("returns null latency for unseen models", () => {
    const tracker = new ModelHealthTracker();
    expect(tracker.getAverageLatency("never-seen")).toBeNull();
  });

  it("trims outcomes to window size of 20", () => {
    const tracker = new ModelHealthTracker();
    for (let i = 0; i < 25; i++) {
      tracker.recordSuccess("model-a", 100);
    }
    // All 20 in window are successes
    expect(tracker.isHealthy("model-a")).toBe(true);
  });
});
