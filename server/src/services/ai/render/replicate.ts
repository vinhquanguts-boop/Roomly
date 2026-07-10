import Replicate from 'replicate';
import type { RenderInput } from '../types.js';

const DEFAULT_REPLICATE_MODEL = 'stability-ai/sdxl';

type ReplicateFileOutput = {
  url?: () => string | URL;
};

type ReplicateVersionsResponse = {
  results?: Array<{ id?: string }>;
};

function isLocalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function prepareImageInput(imageUrl: string): Promise<string | Buffer> {
  if (!isLocalUrl(imageUrl)) {
    return imageUrl;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch local render input image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function outputToUrl(output: unknown): string {
  const first = Array.isArray(output) ? output[0] : output;

  if (typeof first === 'string') {
    return first;
  }

  if (first && typeof first === 'object') {
    const fileOutput = first as ReplicateFileOutput;
    if (typeof fileOutput.url === 'function') {
      return String(fileOutput.url());
    }
  }

  throw new Error('Replicate returned no render URL.');
}

async function resolveReplicateModel(model: string, token: string): Promise<`${string}/${string}`> {
  if (model.includes(':')) {
    return model as `${string}/${string}`;
  }

  const [owner, name] = model.split('/');
  if (!owner || !name) {
    throw new Error(`Invalid Replicate model identifier: ${model}`);
  }

  const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not resolve Replicate model version for ${model}: ${response.status}`);
  }

  const payload = (await response.json()) as ReplicateVersionsResponse;
  const version = payload.results?.find((item) => item.id)?.id;
  if (!version) {
    throw new Error(`Replicate model ${model} has no available versions.`);
  }

  return `${model}:${version}` as `${string}/${string}`;
}

export async function renderWithReplicate(input: RenderInput): Promise<{ url: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  const model = process.env.REPLICATE_SDXL_MODEL || DEFAULT_REPLICATE_MODEL;

  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is required for Replicate rendering.');
  }

  const replicate = new Replicate({ auth: token });
  const output = await replicate.run(await resolveReplicateModel(model, token), {
    input: {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt ?? 'blurry, low quality',
      image: await prepareImageInput(input.originalImageUrl),
      prompt_strength: 0.65,
      num_outputs: 1,
      width: 1024,
      height: 1024,
      guidance_scale: 7.5,
      num_inference_steps: 35,
    },
  });

  return { url: outputToUrl(output) };
}
