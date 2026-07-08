export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export type UploadTarget = {
  roomId: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
  uploadMethod: 'PUT' | 'POST';
};

export type RoomAnalysis = {
  roomType:
    | 'bedroom'
    | 'living_room'
    | 'kitchen'
    | 'bathroom'
    | 'office'
    | 'dining'
    | 'entryway'
    | 'other';
  estimatedDimensions: {
    widthMeters: number | null;
    depthMeters: number | null;
    confidence: 'low' | 'medium' | 'high';
  };
  detectedItems: Array<{
    name: string;
    condition?: 'good' | 'ok' | 'poor';
    keepRecommended: boolean;
  }>;
  palette: {
    dominantColors: string[];
    temperature: 'warm' | 'neutral' | 'cool';
    description: string;
  };
  lightSources: Array<{
    type: 'window' | 'overhead' | 'lamp' | 'natural_only';
    intensity: 'low' | 'medium' | 'high';
    direction?: string;
  }>;
  detectedStyle: string;
  notes: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export async function createRoomUpload(contentType: string): Promise<UploadTarget> {
  const response = await fetch(`${API_BASE_URL}/api/rooms/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType }),
  });

  return parseJsonResponse<UploadTarget>(response);
}

export async function uploadRoomImage(target: UploadTarget, file: File): Promise<void> {
  const response = await fetch(target.uploadUrl, {
    method: target.uploadMethod,
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed with status ${response.status}`);
  }
}

export async function analyzeRoom(roomId: string): Promise<{
  analysis: RoomAnalysis;
  cached: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/analyze`, {
    method: 'POST',
  });

  return parseJsonResponse<{ analysis: RoomAnalysis; cached: boolean }>(response);
}
