export interface AITutorRequest {
  sessionId: string;
  message: string;
}

export interface AITutorResponse {
  text: string;
  phase: string;
  reasoningMoves: string[];
  regulationSignals: string[];
}

export interface AIUsageRecord {
  requestType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  latencyMs: number;
}
