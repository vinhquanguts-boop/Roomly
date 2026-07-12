import type {
  AIProvider,
  ChatInput,
  ChatToolCall,
  DesignPlan,
  DesignPlanInput,
  PreDesignChatInput,
  PreDesignChatOutput,
  RenderInput,
  RoomAnalysis,
  SegmentInput,
} from '../types.js';
import {
  chatToolCallSchema,
  designPlanSchema,
  normalizeDesignPlanPayload,
  preDesignChatOutputSchema,
  roomAnalysisSchema,
} from '../types.js';
import { ROOM_ANALYSIS_SYSTEM, ROOM_ANALYSIS_USER } from '../prompts/roomAnalysis.js';
import { DESIGN_PLAN_SYSTEM, designPlanUserMessage } from '../prompts/designPlan.js';
import { CHAT_SYSTEM } from '../prompts/chat.js';
import { PRE_DESIGN_CHAT_SYSTEM } from '../prompts/preDesignChat.js';
import { parseJsonResponse } from '../parseJson.js';
import { renderWithReplicate } from '../render/replicate.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const VLM_MODEL = process.env.OLLAMA_VLM_MODEL ?? 'qwen2.5vl:7b';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? 'qwen2.5:7b';
const LLM_LARGE_MODEL = process.env.OLLAMA_LLM_LARGE_MODEL || LLM_MODEL;

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image_url'; image_url: { url: string } };
type ChatCompletionMessage =
  | { role: 'system' | 'assistant'; content: string }
  | { role: 'user'; content: string | Array<TextPart | ImagePart> };

async function ollamaChat(model: string, messages: ChatCompletionMessage[]): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama chat failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Ollama returned an empty response.');
  }
  return content;
}

function inferImageMimeType(imageUrl: string, responseContentType: string | null): string {
  const contentType = responseContentType?.split(';')[0]?.trim();
  if (contentType?.startsWith('image/')) {
    return contentType;
  }

  if (imageUrl.endsWith('.png')) return 'image/png';
  if (imageUrl.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch room image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64: buffer.toString('base64'),
    mimeType: inferImageMimeType(imageUrl, response.headers.get('content-type')),
  };
}

export class LocalProvider implements AIProvider {
  async analyzeRoom(imageUrl: string): Promise<RoomAnalysis> {
    const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
    const content = await ollamaChat(VLM_MODEL, [
      { role: 'system', content: ROOM_ANALYSIS_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: ROOM_ANALYSIS_USER },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ]);
    return roomAnalysisSchema.parse(parseJsonResponse(content));
  }

  async generateDesignPlan(input: DesignPlanInput): Promise<DesignPlan> {
    const content = await ollamaChat(LLM_LARGE_MODEL, [
      { role: 'system', content: DESIGN_PLAN_SYSTEM },
      { role: 'user', content: designPlanUserMessage(input) },
    ]);
    return designPlanSchema.parse(normalizeDesignPlanPayload(parseJsonResponse(content)));
  }

  async chatRefine(input: ChatInput): Promise<ChatToolCall> {
    const content = await ollamaChat(LLM_MODEL, [
      { role: 'system', content: `${CHAT_SYSTEM}\n\nCurrent design context:\n${input.designContext}` },
      ...input.history,
      { role: 'user', content: input.userMessage },
    ]);
    return chatToolCallSchema.parse(parseJsonResponse(content));
  }

  async preDesignChat(input: PreDesignChatInput): Promise<PreDesignChatOutput> {
    const content = await ollamaChat(LLM_MODEL, [
      { role: 'system', content: PRE_DESIGN_CHAT_SYSTEM },
      ...input.history,
      { role: 'user', content: input.userMessage },
    ]);
    return preDesignChatOutputSchema.parse(parseJsonResponse(content));
  }

  async renderImage(input: RenderInput): Promise<{ url: string }> {
    if ((process.env.RENDER_MODE ?? 'replicate') === 'replicate') {
      return renderWithReplicate(input);
    }

    throw new Error('Local image rendering is deferred to Phase 3 (ComfyUI).');
  }

  async segmentRegion(input: SegmentInput): Promise<{ maskUrl: string }> {
    void input;

    throw new Error('Local segmentation is deferred to Phase 3 (SAM 2).');
  }

  async embedImage(imageUrl: string): Promise<number[]> {
    void imageUrl;

    throw new Error('Local image embeddings are deferred to Phase 4.');
  }

  async embedText(text: string): Promise<number[]> {
    void text;

    throw new Error('Local text embeddings are deferred to Phase 4.');
  }
}
