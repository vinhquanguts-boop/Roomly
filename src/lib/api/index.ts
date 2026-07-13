import { isStaticDeployment } from '@/lib/deployment';

const localApiOrigin = `${window.location.protocol}//${window.location.hostname}:8787`;

export const API_BASE_URL = isStaticDeployment ? '' : (import.meta.env.VITE_API_URL ?? localApiOrigin);

export * from './subscription';

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
  soldCount: number;
  trust: ProductTrust | null;
};

export type ProductTrustLabel = 'safe_pick' | 'good_bet' | 'roll_the_dice' | 'limited_signals';

export type ProductTrust = {
  label: ProductTrustLabel;
  score: number | null;
  source: 'curated_catalog';
  reviewCount: number | null;
  positivePct: number | null;
  negativeFlags: string[];
  feedbackCount: number;
  updatedAt: string | null;
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
  sharedSlug: string | null;
  savedAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
};

export type AuthConfig = {
  googleEnabled: boolean;
};

export type DashboardDesign = {
  id: string;
  sharedSlug: string | null;
  savedAt: string | null;
  updatedAt: string;
  status: DesignStatus;
  budget: number;
  currency: string;
  styleDirection: string | null;
  thumbnailUrl: string | null;
};

export type ProductFollowUp = {
  clickId: string;
  designId: string;
  clickedAt: string;
  dueAt: string;
  product: {
    id: string;
    title: string;
    retailer: string;
    imageUrl: string | null;
  };
};

export type PublicDesign = Design & {
  sharedSlug: string;
  publishedAt: string;
  styleTags: string[];
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
  userNotes?: string;
};

export type DesignBrief = {
  roomType: RoomAnalysis['roomType'];
  budget: number;
  currency: 'AUD' | 'USD' | 'NZD';
  stylePreference: string;
  deliveryUrgency: 'urgent' | 'normal' | 'flexible';
  userNotes: string;
};

export type PreChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
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

export function productClickUrl(designId: string, productId: string): string {
  const params = new URLSearchParams({ id: productId, design_id: designId });
  return `${API_BASE_URL}/api/products/track-click?${params.toString()}`;
}

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
    credentials: 'include',
    body: JSON.stringify({ contentType }),
  });

  return parseJsonResponse<UploadTarget>(response);
}

export async function uploadRoomImage(target: UploadTarget, file: File): Promise<void> {
  const response = await fetch(target.uploadUrl, {
    method: target.uploadMethod,
    headers: { 'Content-Type': file.type },
    credentials: target.uploadUrl.startsWith(API_BASE_URL) ? 'include' : 'omit',
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
    credentials: 'include',
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
    credentials: 'include',
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ designId: string }>(response);
}

export async function getDesign(designId: string): Promise<{ design: Design }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}`, {
    credentials: 'include',
  });

  return parseJsonResponse<{ design: Design }>(response);
}

export async function getDesignChat(designId: string): Promise<{ messages: ChatMessage[] }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/chat`, {
    credentials: 'include',
  });

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
    credentials: 'include',
    body: JSON.stringify({ message }),
  });

  return parseJsonResponse<{
    message: ChatMessage;
    action: ChatAction;
    changedPosition: number | null;
    design: Design;
  }>(response);
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${API_BASE_URL}/api/auth/config`, {
    credentials: 'include',
  });

  return parseJsonResponse<AuthConfig>(response);
}

export async function migrateAnonymousDesigns(): Promise<{ migrated: number }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/migrate-anonymous`, {
    method: 'POST',
    credentials: 'include',
  });

  return parseJsonResponse<{ migrated: number }>(response);
}

export async function saveDesign(designId: string): Promise<{ design: Design }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/save`, {
    method: 'POST',
    credentials: 'include',
  });

  return parseJsonResponse<{ design: Design }>(response);
}

export async function publishDesign(designId: string): Promise<{
  publicUrl: string;
  previewUrl: string;
  design: PublicDesign;
}> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/publish`, {
    method: 'POST',
    credentials: 'include',
  });

  return parseJsonResponse<{
    publicUrl: string;
    previewUrl: string;
    design: PublicDesign;
  }>(response);
}

export async function unpublishDesign(designId: string): Promise<{ design: Design }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${designId}/unpublish`, {
    method: 'POST',
    credentials: 'include',
  });

  return parseJsonResponse<{ design: Design }>(response);
}

export async function getDashboardDesigns(): Promise<{ designs: DashboardDesign[] }> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/designs`, {
    credentials: 'include',
  });

  return parseJsonResponse<{ designs: DashboardDesign[] }>(response);
}

export async function getProductFollowUps(): Promise<{ followUps: ProductFollowUp[] }> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/follow-ups`, {
    credentials: 'include',
  });

  return parseJsonResponse<{ followUps: ProductFollowUp[] }>(response);
}

export async function createChatSession(): Promise<{ sessionId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJsonResponse<{ sessionId: string }>(response);
}

export async function getChatSession(sessionId: string): Promise<{ messages: PreChatMessage[] }> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`, {
    credentials: 'include',
  });
  return parseJsonResponse<{ messages: PreChatMessage[] }>(response);
}

export async function sendChatMessage(
  sessionId: string,
  content: string
): Promise<{
  message: PreChatMessage;
  brief: DesignBrief | null;
  readyToDesign: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return parseJsonResponse<{
    message: PreChatMessage;
    brief: DesignBrief | null;
    readyToDesign: boolean;
  }>(response);
}

export async function submitProductFeedback(input: {
  clickId: string;
  purchased: boolean;
  satisfied?: boolean;
  notes?: string;
}): Promise<{ feedback: { id: string }; trust: ProductTrust | null }> {
  const response = await fetch(`${API_BASE_URL}/api/products/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ feedback: { id: string }; trust: ProductTrust | null }>(response);
}

export async function getExploreDesigns(): Promise<{
  designs: Array<DashboardDesign & { publishedAt: string; styleTags: string[] }>;
}> {
  const response = await fetch(`${API_BASE_URL}/api/explore`, {
    credentials: 'include',
  });

  return parseJsonResponse<{
    designs: Array<DashboardDesign & { publishedAt: string; styleTags: string[] }>;
  }>(response);
}

export async function getPublicDesign(slug: string): Promise<{ design: PublicDesign }> {
  const response = await fetch(`${API_BASE_URL}/api/designs/public/${slug}`, {
    credentials: 'include',
  });

  return parseJsonResponse<{ design: PublicDesign }>(response);
}
