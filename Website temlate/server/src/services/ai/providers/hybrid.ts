import type { DesignPlan, DesignPlanInput } from '../types.js';
import { designPlanSchema, normalizeDesignPlanPayload } from '../types.js';
import { DESIGN_PLAN_SYSTEM, designPlanUserMessage } from '../prompts/designPlan.js';
import { parseJsonResponse } from '../parseJson.js';
import { LocalProvider } from './local.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Hybrid: local Ollama handles room analysis and chat (inherited from LocalProvider).
// Design plan generation uses DeepSeek directly for higher-quality reasoning.
export class HybridProvider extends LocalProvider {
  async generateDesignPlan(input: DesignPlanInput): Promise<DesignPlan> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required for hybrid mode.');
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
        messages: [
          { role: 'system', content: DESIGN_PLAN_SYSTEM },
          { role: 'user', content: designPlanUserMessage(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek design plan failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek returned an empty response.');
    }

    return designPlanSchema.parse(normalizeDesignPlanPayload(parseJsonResponse(content)));
  }
}
