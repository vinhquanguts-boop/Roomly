import { aiUsage } from '../db/schema.js';
import { getDb } from '../db/index.js';
import type { RequestOwner } from './request-context.js';
import { logError, logInfo, safeErrorCode } from './logging.js';

export type AiOperation = 'room_analysis' | 'design_plan' | 'design_refinement' | 'pre_design_chat' | 'render';

type AiUsageContext = {
  owner: RequestOwner;
  operation: AiOperation;
  roomId?: string;
  designId?: string;
};

function modelForOperation(operation: AiOperation): string {
  if (operation === 'room_analysis') {
    return process.env.OLLAMA_VLM_MODEL ?? 'qwen2.5vl:7b';
  }

  if (operation === 'render') {
    return process.env.RENDER_MODE ?? 'plan-only';
  }

  return process.env.OLLAMA_LLM_LARGE_MODEL || process.env.OLLAMA_LLM_MODEL || 'qwen2.5:7b';
}

async function writeUsage(params: AiUsageContext & { durationMs: number; outcome: 'completed' | 'failed'; errorCode?: string }): Promise<void> {
  try {
    await getDb().insert(aiUsage).values({
      ownerSessionId: params.owner.sessionId,
      ownerAuthUserId: params.owner.authUserId,
      roomId: params.roomId,
      designId: params.designId,
      operation: params.operation,
      provider: 'ollama',
      model: modelForOperation(params.operation),
      inputTokens: null,
      outputTokens: null,
      durationMs: params.durationMs,
      estimatedCostUsd: '0.0000',
      outcome: params.outcome,
    });
    logInfo('ai_operation', {
      operation: params.operation,
      model: modelForOperation(params.operation),
      duration_ms: params.durationMs,
      outcome: params.outcome,
      estimated_cost_usd: 0,
      error_code: params.errorCode,
    });
  } catch {
    logError('ai_usage_log_failed', { operation: params.operation });
  }
}

export async function runTrackedAiOperation<T>(context: AiUsageContext, operation: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    await writeUsage({ ...context, durationMs: Date.now() - startedAt, outcome: 'completed' });
    return result;
  } catch (error) {
    await writeUsage({
      ...context,
      durationMs: Date.now() - startedAt,
      outcome: 'failed',
      errorCode: safeErrorCode(error),
    });
    throw error;
  }
}
