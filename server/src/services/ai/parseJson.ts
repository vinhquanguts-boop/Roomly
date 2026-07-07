export function parseJsonResponse(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }
    throw new Error(`Could not parse JSON from model response: ${trimmed.slice(0, 200)}`);
  }
}
