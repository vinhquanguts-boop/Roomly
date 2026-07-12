type LogFields = Record<string, boolean | number | string | null | undefined>;

function write(level: 'error' | 'info' | 'warn', event: string, fields: LogFields = {}): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
  };
  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.info(output);
  }
}

export function logInfo(event: string, fields?: LogFields): void {
  write('info', event, fields);
}

export function logWarning(event: string, fields?: LogFields): void {
  write('warn', event, fields);
}

export function logError(event: string, fields?: LogFields): void {
  write('error', event, fields);
}

export function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown_error';

  const ollamaStatus = error.message.match(/^Ollama chat failed: (\d{3})/);
  if (ollamaStatus) return `ollama_http_${ollamaStatus[1]}`;
  if (error.message.startsWith('Could not fetch room image:')) return 'room_image_fetch_failed';
  if (error.message.startsWith('Ollama returned an empty response.')) return 'ollama_empty_response';
  if (error.message.includes('JSON')) return 'invalid_ai_json';
  if (error.name === 'ZodError') return 'invalid_ai_schema';
  return 'operation_failed';
}
