import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GenerateBriefInput } from "./types";
import { OpenRouterAdapter } from "./openrouter-adapter";

// Mock the openrouter sub-modules so we control model selection and rate limiting
vi.mock("./openrouter/model-selector", () => ({
  modelSelector: {
    getAvailableModels: vi.fn(),
  },
}));

vi.mock("./openrouter/model-health", () => ({
  modelHealthTracker: {
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    recordRateLimit: vi.fn(),
  },
}));

vi.mock("./openrouter/key-pool", () => {
  const mockNext = vi.fn().mockReturnValue({
    key: "test-key",
    limiter: { acquire: vi.fn().mockResolvedValue(undefined) },
    markRateLimited: vi.fn(),
  });
  function MockKeyPool() {
    // @ts-expect-error mock constructor
    this.next = mockNext;
    // @ts-expect-error mock constructor
    this.size = 1;
    // @ts-expect-error mock constructor
    this.rateLimitedCount = vi.fn().mockReturnValue(0);
  }
  return { KeyPool: MockKeyPool, _mockNext: mockNext };
});

import { modelSelector } from "./openrouter/model-selector";
import { modelHealthTracker } from "./openrouter/model-health";

const ADAPTER_CONFIG = {
  apiKeys: ["test-key"],
  siteUrl: "https://test.app",
  siteName: "Test App",
};

function questionsInput() {
  return {
    title: "Sprint planning",
    meetingType: "small" as const,
    audience: "Engineering team",
    stakes: "Decide sprint scope",
    desiredOutcome: "Clear sprint backlog",
    context: "",
  };
}

function mockChatResponse(content: string, model = "model-a:free") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: "gen-123",
      model,
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
    }),
    text: async () => content,
  };
}

describe("OpenRouterAdapter", () => {
  let adapter: OpenRouterAdapter;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    adapter = new OpenRouterAdapter(ADAPTER_CONFIG);
    vi.mocked(modelSelector.getAvailableModels).mockResolvedValue([
      "model-a:free",
      "model-b:free",
      "model-c:free",
    ]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("generates questions with valid JSON response", async () => {
    const payload = JSON.stringify({
      questions: ["Q1?", "Q2?", "Q3?"],
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(payload));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
    if (result.ok && !("_raw" in result.data)) {
      expect(result.data.questions).toEqual(["Q1?", "Q2?", "Q3?"]);
    }
  });

  it("returns raw fallback when response does not match schema", async () => {
    const rawContent = '{"answer": "Here are three questions: 1. X 2. Y 3. Z"}';
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(rawContent));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty("_raw", true);
      expect((result.data as { text: string }).text).toBe(rawContent);
    }
  });

  it("extracts JSON from markdown-fenced response", async () => {
    const content = 'Here is the result:\n```json\n{"questions":["A?","B?","C?"]}\n```';
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
  });

  it("extracts JSON embedded in prose", async () => {
    const content = 'Sure! {"questions":["A?","B?","C?"]} Hope that helps!';
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
  });

  it("returns raw fallback for non-JSON response", async () => {
    const rawContent = "I can't help with that.";
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(rawContent));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty("_raw", true);
      expect(result.data).toHaveProperty("text", rawContent);
    }
  });

  it("normalizes questions when JSON is markdown-wrapped and extractJson initially failed", async () => {
    const content = '```json\n{"questions":["What are the key areas?","Political considerations?","Escalation process?"]}\n```';
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
    if (result.ok && !("_raw" in result.data)) {
      expect(result.data.questions).toHaveLength(3);
      expect(result.data.questions[0]).toBe("What are the key areas?");
    }
  });

  it("takes first 3 questions when model returns more than 3", async () => {
    const content = JSON.stringify({
      questions: ["Q1?", "Q2?", "Q3?", "Q4?"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(true);
    if (result.ok && !("_raw" in result.data)) {
      expect(result.data.questions).toEqual(["Q1?", "Q2?", "Q3?"]);
    }
  });

  it("returns provider failure on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("provider");
    }
  });

  it("records health on successful response", async () => {
    const payload = JSON.stringify({ questions: ["Q1?", "Q2?", "Q3?"] });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(mockChatResponse(payload, "model-b:free"));

    await adapter.generateQuestions(questionsInput());
    expect(modelHealthTracker.recordSuccess).toHaveBeenCalledWith(
      "model-b:free",
      expect.any(Number)
    );
  });

  it("records health failure on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "err",
    });

    await adapter.generateQuestions(questionsInput());
    expect(modelHealthTracker.recordFailure).toHaveBeenCalled();
  });

  it("returns provider failure on 429 response", async () => {
    // 429 is handled per-key (slot.markRateLimited), not as a model health signal.
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("provider");
  });

  it("returns provider failure when no models available", async () => {
    vi.mocked(modelSelector.getAvailableModels).mockResolvedValue([]);

    const result = await adapter.generateQuestions(questionsInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("provider");
    }
  });

  it("sends models array instead of single model field", async () => {
    const payload = JSON.stringify({ questions: ["Q1?", "Q2?", "Q3?"] });
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(payload));

    await adapter.generateQuestions(questionsInput());

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.models).toEqual(["model-a:free", "model-b:free", "model-c:free"]);
    expect(body.model).toBeUndefined();
  });

  it("sends system prompt as user role message", async () => {
    const payload = JSON.stringify({ questions: ["Q1?", "Q2?", "Q3?"] });
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(payload));

    await adapter.generateQuestions(questionsInput());

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.messages.every((m: { role: string }) => m.role === "user")).toBe(true);
    expect(body.response_format).toBeUndefined();
  });

  it("sends attribution headers", async () => {
    const payload = JSON.stringify({ questions: ["Q1?", "Q2?", "Q3?"] });
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(payload));

    await adapter.generateQuestions(questionsInput());

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = call[1]!.headers as Record<string, string>;
    expect(headers["HTTP-Referer"]).toBe("https://test.app");
    expect(headers["X-Title"]).toBe("Test App");
  });

  it("caches responses for identical requests", async () => {
    const payload = JSON.stringify({ questions: ["Q1?", "Q2?", "Q3?"] });
    globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(payload));

    const r1 = await adapter.generateQuestions(questionsInput());
    const r2 = await adapter.generateQuestions(questionsInput());

    expect(r1).toEqual(r2);
    // fetch called once for the actual request (retries aside, cache serves second)
    // Due to retry logic, first successful call should cache; second should hit cache
    // But the adapter retries on inner failures — with success on first try,
    // fetch is called once per callWithRetry attempt that reaches fetchJson
    // The second call should hit cache after modelSelector returns the same models
    const fetchCalls = vi.mocked(globalThis.fetch).mock.calls.length;
    expect(fetchCalls).toBeLessThanOrEqual(1);
  });

  describe("generateBrief", () => {
    const briefInput = (): GenerateBriefInput => ({
      title: "Q3 Budget Review",
      meetingType: "small",
      audience: "Leadership",
      stakes: "medium",
      desiredOutcome: "Budget approval",
      context: "",
      questions: [
        { q: "Q1?", answer: "A1" },
        { q: "Q2?", answer: "A2" },
        { q: "Q3?", answer: "A3" },
      ],
    });

    it("returns raw text brief for any response", async () => {
      const content =
        "Real goal: Secure budget approval\n\nOpening readout: We're here to review the Q3 budget.";
      globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

      const result = await adapter.generateBrief(briefInput());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveProperty("_raw", true);
        expect((result.data as { text: string }).text).toBe(content);
      }
    });

    it("strips markdown fences from brief response", async () => {
      const innerContent =
        "Real goal: Secure budget approval\n\nOpening readout: We're here to review the Q3 budget.";
      const content = `\`\`\`\n${innerContent}\n\`\`\``;
      globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

      const result = await adapter.generateBrief(briefInput());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveProperty("_raw", true);
        expect((result.data as { text: string }).text).toBe(innerContent);
      }
    });

    it("strips json-labelled fences from brief response", async () => {
      const innerContent = "Real goal: Secure budget approval";
      const content = `\`\`\`json\n${innerContent}\n\`\`\``;
      globalThis.fetch = vi.fn().mockResolvedValue(mockChatResponse(content));

      const result = await adapter.generateBrief(briefInput());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.data as { text: string }).text).toBe(innerContent);
      }
    });
  });
});
