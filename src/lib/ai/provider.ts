export interface AIMessage {
  role: "system" | "user";
  content: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  temperature: number;
  maxTokens: number;
  /** JSON Schema object describing the expected response shape */
  responseSchema: Record<string, unknown>;
}

export interface AIProviderResult<T> {
  data: T;
  usage: { promptTokens: number; completionTokens: number };
}

export interface AIProvider {
  generate<T>(options: AIGenerateOptions): Promise<AIProviderResult<T>>;
}
