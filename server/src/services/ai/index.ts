import type { AIProvider } from './types.js';
import { CloudProvider } from './providers/cloud.js';
import { HybridProvider } from './providers/hybrid.js';
import { LocalProvider } from './providers/local.js';

export function getAI(): AIProvider {
  const mode = process.env.AI_MODE ?? 'hybrid';

  switch (mode) {
    case 'local':
      return new LocalProvider();
    case 'hybrid':
      return new HybridProvider();
    case 'cloud':
      return new CloudProvider();
    default:
      throw new Error(`Unknown AI_MODE: ${mode}`);
  }
}
