import { loadEnv } from '../lib/env.js';

loadEnv();

// Dynamic import: provider modules read process.env at import time, so this must run after loadEnv().
const { getAI } = await import('../services/ai/index.js');

const SAMPLE_ROOM_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

async function checkOllamaModels() {
  const baseUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  const response = await fetch(`${baseUrl}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama health check failed: ${response.status}`);
  }

  const data = (await response.json()) as { models?: Array<{ name: string }> };
  const modelNames = new Set((data.models ?? []).map((model) => model.name));
  const requiredModels = [
    process.env.OLLAMA_VLM_MODEL ?? 'qwen2.5vl:7b',
    process.env.OLLAMA_LLM_MODEL ?? 'qwen2.5:7b',
  ];

  const missing = requiredModels.filter((model) => !modelNames.has(model));
  if (missing.length > 0) {
    throw new Error(`Ollama is missing required model(s): ${missing.join(', ')}`);
  }

  return requiredModels;
}

// Auth pings only check that a credential authenticates - they never log the credential itself.
async function checkDeepSeekAuth() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is missing.');
  }

  const response = await fetch('https://api.deepseek.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`DeepSeek credential did not authenticate (status ${response.status}).`);
  }
}

async function checkFireworksAuth() {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    throw new Error('FIREWORKS_API_KEY is missing.');
  }

  const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Fireworks credential did not authenticate (status ${response.status}).`);
  }
}

async function checkReplicateAuth() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is missing.');
  }

  const response = await fetch('https://api.replicate.com/v1/models/replicate/hello-world', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Replicate credential did not authenticate (status ${response.status}).`);
  }
}

async function exerciseProvider() {
  const ai = getAI();

  console.info('\n1. analyzeRoom() via the selected AIProvider...');
  const analysis = await ai.analyzeRoom(SAMPLE_ROOM_IMAGE);
  console.info(`   roomType: ${analysis.roomType}`);
  console.info(`   detectedStyle: ${analysis.detectedStyle}`);
  console.info(
    `   detectedItems: ${analysis.detectedItems.map((item) => item.name).join(', ') || '(none)'}`
  );

  console.info('\n2. generateDesignPlan() via the selected AIProvider...');
  const plan = await ai.generateDesignPlan({
    budget: 300,
    currency: 'AUD',
    styleDirection: 'warm minimalist',
    deliveryUrgency: 'normal',
    existingItemsToKeep: [],
    roomAnalysis: analysis,
  });
  console.info(`   styleDirection: ${plan.styleDirection}`);
  console.info(`   palette: ${plan.palette.hexColors.join(', ')}`);
  console.info(`   items: ${1 + plan.supporting.length}`);
  console.info(`   estimatedCost: ${plan.totalEstimatedCost.min}-${plan.totalEstimatedCost.max}`);
}

async function main() {
  const mode = process.env.AI_MODE ?? 'hybrid';
  console.info(`AI mode: ${mode}`);

  if (mode === 'local' || mode === 'hybrid') {
    const models = await checkOllamaModels();
    console.info(`Ollama reachable. Required models present: ${models.join(', ')}`);
  }

  if (mode === 'hybrid') {
    await checkDeepSeekAuth();
    console.info('DeepSeek credential authenticated.');
  }

  if (mode === 'cloud') {
    if (!process.env.FIREWORKS_API_KEY) {
      console.info(
        'FIREWORKS_API_KEY not set - skipping live cloud smoke test (structural check only).'
      );
      return;
    }
    await checkFireworksAuth();
    console.info('Fireworks credential authenticated.');

    if (process.env.REPLICATE_API_TOKEN) {
      await checkReplicateAuth();
      console.info('Replicate credential authenticated.');
    }
  }

  await exerciseProvider();

  console.info(`\nAI smoke test passed for ${mode} mode.`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nAI smoke test failed: ${message}`);
  process.exitCode = 1;
}
