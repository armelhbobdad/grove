// AI Settings API (providers + audio)

import { apiClient } from './client';
import type { AudioSettings, ProviderProfile } from '../components/AI/types';

// ─── Provider Types ─────────────────────────────────────────────────────────

export interface ProviderResponse {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key: string; // masked
  model: string;
  status: string;
}

interface ProvidersListResponse {
  providers: ProviderResponse[];
}

interface CreateProviderRequest {
  name: string;
  type: string;
  base_url: string;
  api_key: string;
  model: string;
}

interface UpdateProviderRequest {
  name?: string;
  type?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  status?: string;
}

interface VerifyResponse {
  status: string;
  message: string;
}

// ─── Provider API ───────────────────────────────────────────────────────────

export async function listProviders(): Promise<ProviderProfile[]> {
  const resp = await apiClient.get<ProvidersListResponse>('/api/v1/ai/providers');
  return resp.providers.map(serverToProvider);
}

export async function createProvider(
  data: Omit<ProviderProfile, 'id' | 'status'>,
): Promise<ProviderProfile> {
  const req: CreateProviderRequest = {
    name: data.name,
    type: data.type,
    base_url: data.baseUrl,
    api_key: data.apiKey,
    model: data.model,
  };
  const resp = await apiClient.post<CreateProviderRequest, ProviderResponse>(
    '/api/v1/ai/providers',
    req,
  );
  return serverToProvider(resp);
}

export async function updateProvider(
  id: string,
  data: Partial<ProviderProfile>,
): Promise<ProviderProfile> {
  const req: UpdateProviderRequest = {};
  if (data.name !== undefined) req.name = data.name;
  if (data.type !== undefined) req.type = data.type;
  if (data.baseUrl !== undefined) req.base_url = data.baseUrl;
  if (data.apiKey !== undefined) req.api_key = data.apiKey;
  if (data.model !== undefined) req.model = data.model;
  if (data.status !== undefined) req.status = data.status;

  const resp = await apiClient.put<UpdateProviderRequest, ProviderResponse>(
    `/api/v1/ai/providers/${id}`,
    req,
  );
  return serverToProvider(resp);
}

export async function deleteProvider(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/ai/providers/${id}`);
}

export async function verifyProvider(id: string): Promise<VerifyResponse> {
  return apiClient.post<Record<string, never>, VerifyResponse>(
    `/api/v1/ai/providers/${id}/verify`,
    {},
  );
}

function serverToProvider(s: ProviderResponse): ProviderProfile {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    baseUrl: s.base_url,
    apiKey: s.api_key,
    model: s.model,
    status: s.status as ProviderProfile['status'],
  };
}

// ─── Audio API ──────────────────────────────────────────────────────────────

export async function getAudioSettings(projectId?: string): Promise<AudioSettings> {
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return apiClient.get<AudioSettings>(`/api/v1/ai/audio${params}`);
}

export async function saveAudioGlobal(settings: AudioSettings): Promise<void> {
  const body = {
    enabled: settings.enabled,
    transcribeProvider: settings.transcribeProvider,
    preferredLanguages: settings.preferredLanguages,
    toggleShortcut: settings.toggleShortcut,
    pushToTalkKey: settings.pushToTalkKey,
    maxDuration: settings.maxDuration,
    minDuration: settings.minDuration,
    reviseEnabled: settings.reviseEnabled,
    reviseProvider: settings.reviseProvider,
    revisePromptGlobal: settings.revisePromptGlobal,
    preferredTermsGlobal: settings.preferredTermsGlobal,
    forbiddenTermsGlobal: settings.forbiddenTermsGlobal,
    replacementsGlobal: settings.replacementsGlobal,
  };
  await apiClient.put('/api/v1/ai/audio', body);
}

export async function saveAudioProject(
  projectId: string,
  settings: AudioSettings,
): Promise<void> {
  const body = {
    revisePromptProject: settings.revisePromptProject,
    preferredTermsProject: settings.preferredTermsProject,
    forbiddenTermsProject: settings.forbiddenTermsProject,
    replacementsProject: settings.replacementsProject,
  };
  await apiClient.put(`/api/v1/projects/${projectId}/ai/audio`, body);
}

// ─── Transcribe API ─────────────────────────────────────────────────────────

export interface TranscribeResult {
  raw: string;
  revised: string | null;
  final: string;
}

export async function transcribeAudio(
  audioBlob: Blob,
  projectId?: string,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  if (projectId) {
    formData.append('project_id', projectId);
  }
  return apiClient.postFormData<TranscribeResult>('/api/v1/ai/transcribe', formData, signal);
}
