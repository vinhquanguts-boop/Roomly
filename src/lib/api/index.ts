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

export type DesignPlan = {
  styleDirection: string;
  palette: {
    hexColors: string[];
    rationale: string;
  };
  hero: {
    category: string;
    priceRange: { min: number; max: number };
    description: string;
    rationale: string;
  };
  supporting: Array<{
    category: string;
    priceRange: { min: number; max: number };
    description: string;
    rationale: string;
    priority: 'essential' | 'important' | 'nice-to-have';
  }>;
  designPrinciples: string[];
  totalEstimatedCost: { min: number; max: number };
};

export type DesignStatus = 'pending' | 'plan_ready' | 'render_ready' | 'complete' | 'failed';

export type Product = {
  id: string;
  retailer: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  price: number;
  currency: string;
  deliveryEstimate: string | null;
  rating: number | null;
  qualityRiskScore: number | null;
};

export type ShoppingItem = {
  designItemId: string;
  position: number;
  category: string;
  rationale: string | null;
  priceAtGeneration: number | null;
  currencyAtGeneration: string | null;
  product: Product | null;
};

export type Design = {
  id: string;
  roomId: string;
  status: DesignStatus;
  budget: number;
  currency: string;
  styleDirection: string | null;
  designPlan: DesignPlan | null;
  renderUrl: string | null;
  errorMessage: string | null;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
};

export type SetupDraft = {
  roomId: string;
  budget: number;
  currency: 'AUD' | 'USD' | 'NZD';
  roomTypeOverride:
    | 'bedroom'
    | 'living_room'
    | 'kitchen'
    | 'bathroom'
    | 'office'
    | 'dining'
    | 'entryway'
    | 'other';
  deliveryUrgency: 'urgent' | 'normal' | 'flexible';
  stylePreference: string;
};

export type QuizAnswer = {
  questionId: string;
  optionId: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ChatAction = 'answer' | 'swap_item' | 'regenerate_all';

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

export async function createDesign(input: {
  roomId: string;
  setup: SetupDraft;
  quizAnswers: QuizAnswer[];
}): Promise<{ designId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/designs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ designId: string }>(response);
}

export async function getDesign(designId: string): Promise<{ design: Design }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}`);

  return parseJsonResponse<{ design: Design }>(response);
}

export async function getDesignChat(designId: string): Promise<{ messages: ChatMessage[] }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/chat`);

  return parseJsonResponse<{ messages: ChatMessage[] }>(response);
}

export async function sendDesignChat(designId: string, message: string): Promise<{
  message: ChatMessage;
  action: ChatAction;
  changedPosition: number | null;
  design: Design;
}> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  return parseJsonResponse<{
    message: ChatMessage;
    action: ChatAction;
    changedPosition: number | null;
    design: Design;
  }>(response);
}
