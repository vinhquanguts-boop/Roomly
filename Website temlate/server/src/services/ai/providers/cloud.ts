import type {
  AIProvider,
  ChatInput,
  ChatToolCall,
  DesignPlan,
  DesignPlanInput,
  RenderInput,
  RoomAnalysis,
  SegmentInput,
} from '../types.js';
import {
  chatToolCallSchema,
  designPlanSchema,
  normalizeDesignPlanPayload,
  roomAnalysisSchema,
} from '../types.js';
import { ROOM_ANALYSIS_SYSTEM, ROOM_ANALYSIS_USER } from '../prompts/roomAnalysis.js';
import { DESIGN_PLAN_SYSTEM, designPlanUserMessage } from '../prompts/designPlan.js';
import { CHAT_SYSTEM } from '../prompts/chat.js';
import { parseJsonResponse } from '../parseJson.js';
import Replicate from 'replicate';

const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const VLM_MODEL =
  process.env.FIREWORKS_VLM_MODEL ?? 'accounts/fireworks/models/qwen2p5-vl-7b-instruct';
const LLM_MODEL = process.env.FIREWORKS_LLM_MODEL ?? 'accounts/fireworks/models/deepseek-v3';

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image_url'; image_url: { url: string } };
type ChatCompletionMessage =
  | { role: 'system' | 'assistant'; content: string }
  | { role: 'user'; content: string | Array<TextPart | ImagePart> };

function requireFireworksKey(): string {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is required for cloud mode.');
  }
  return apiKey;
}

async function fireworksChat(model: string, messages: ChatCompletionMessage[]): Promise<string> {
  const apiKey = requireFireworksKey();

  const response = await fetch(FIREWORKS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 2500,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fireworks call failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Fireworks returned an empty response.');
  }
  return content;
}

export class CloudProvider implements AIProvider {
  async analyzeRoom(imageUrl: string): Promise<RoomAnalysis> {
    const content = await fireworksChat(VLM_MODEL, [
      { role: 'system', content: ROOM_ANALYSIS_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: ROOM_ANALYSIS_USER },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ]);
    return roomAnalysisSchema.parse(parseJsonResponse(content));
  }

  async generateDesignPlan(input: DesignPlanInput): Promise<DesignPlan> {
    const content = await fireworksChat(LLM_MODEL, [
      { role: 'system', content: DESIGN_PLAN_SYSTEM },
      { role: 'user', content: designPlanUserMessage(input) },
    ]);
    return designPlanSchema.parse(normalizeDesignPlanPayload(parseJsonResponse(content)));
  }

  async chatRefine(input: ChatInput): Promise<ChatToolCall> {
    const content = await fireworksChat(LLM_MODEL, [
      { role: 'system', content: `${CHAT_SYSTEM}\n\nCurrent design context:\n${input.designContext}` },
      ...input.history,
      { role: 'user', content: input.userMessage },
    ]);
    return chatToolCallSchema.parse(parseJsonResponse(content));
  }

  async renderImage(input: RenderInput): Promise<{ url: string }> {
    const token = process.env.REPLICATE_API_TOKEN;
    const model = process.env.REPLICATE_SDXL_MODEL;
    if (!token || !model) {
      throw new Error(
        'Cloud image rendering requires REPLICATE_API_TOKEN and REPLICATE_SDXL_MODEL; wiring lands in Phase 3.'
      );
    }

    const replicate = new Replicate({ auth: token });
    const output = (await replicate.run(model as `${string}/${string}`, {
      input: {
        prompt: input.prompt,
        negative_prompt: input.negativePrompt ?? 'blurry, low quality',
        image: input.originalImageUrl,
        controlnet_conditioning_scale: 0.6,
      },
    })) as string[] | string;

    const url = Array.isArray(output) ? output[0] : output;
    return { url };
  }

  async segmentRegion(input: SegmentInput): Promise<{ maskUrl: string }> {
    void input;

    throw new Error('Cloud segmentation (Replicate SAM 2) is deferred to Phase 3.');
  }

  async embedImage(imageUrl: string): Promise<number[]> {
    void imageUrl;

    throw new Error('Cloud image embeddings (Modal) are deferred to Phase 4.');
  }

  async embedText(text: string): Promise<number[]> {
    void text;

    throw new Error('Cloud text embeddings (Modal) are deferred to Phase 4.');
  }
}
