import type { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

// Re-export para conveniência
export type { ChatCompletionTool, ChatCompletionMessageParam };

/**
 * Registro de bloqueio temporário de um usuário.
 * Preparado para futura feature de bloqueio de 15 min.
 */
export interface BlockRecord {
  userId: string;
  until: Date;
  reason: string;
}

/**
 * Representa uma função executável pelo agente AI.
 * needsPhone = true: injeta phoneNumber antes de chamar fn().
 */
export interface FunctionExecutor {
  fn: (args: AgentFunctionArgs) => Promise<unknown>;
  needsPhone: boolean;
}

/** Argumentos genéricos de uma função do agente */
export interface AgentFunctionArgs {
  phoneNumber: string;
  [key: string]: unknown;
}

/** Mapa de executores indexado pelo nome da função */
export type AgentFunctionMap = Record<string, FunctionExecutor>;

// ─── Parâmetros das funções do executor ────────────────────────────────────

export interface CreateTaskParams {
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: 1 | 2 | 3 | 4;
  project_name?: string | null;
  section_name?: string | null;
  parent_task_id?: string | null;
  labels?: string[];
  assigned_user_identifier?: string | null;
  phoneNumber: string;
}

export interface EditTaskParams {
  task_id: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: 1 | 2 | 3 | 4;
  project_name?: string | null;
  section_name?: string | null;
  labels?: string[];
  phoneNumber: string;
}

export interface DeleteTaskParams {
  task_id?: string;
  task_title?: string;
  phoneNumber: string;
}

export interface DeleteAllUserTasksParams {
  confirm: boolean;
  phoneNumber: string;
}

export interface DeleteProjectParams {
  project_name: string;
  phoneNumber: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string | null;
  assigned_user_identifier?: string | null;
  phoneNumber: string;
}

export interface EditProjectParams {
  project_name: string;
  new_name?: string;
  description?: string | null;
  theme_gradient?: string | null;
  phoneNumber: string;
}

export interface SearchTasksParams {
  query: string;
  phoneNumber: string;
}

export interface SearchProjectsParams {
  name: string;
  phoneNumber: string;
}

export interface SearchLabelsParams {
  name: string;
  phoneNumber: string;
}

export interface ListLabelsParams {
  phoneNumber: string;
}

export interface AssignTaskParams {
  task_id: string;
  user_identifier: string;
  phoneNumber: string;
}

export interface AssignProjectMemberParams {
  project_name: string;
  user_identifier: string;
  phoneNumber: string;
}

export interface RemoveProjectMemberParams {
  project_name: string;
  user_identifier: string;
  phoneNumber: string;
}

export interface ListTasksParams {
  project_name?: string | null;
  label_name?: string | null;
  user_email?: string | null;
  filter?: 'all' | 'pending' | 'completed' | 'today' | 'overdue' | string | null;
  phoneNumber: string;
}

export interface UpdateStatusParams {
  task_id: string;
  new_status: 'pending' | 'in_progress' | 'completed';
  phoneNumber: string;
}

export interface SendMessageParams {
  to_phone: string;
  message: string;
  phoneNumber: string;
}

export interface ListProjectsParams {
  target_user?: string | null;
  phoneNumber: string;
}

export interface FocusSessionParams {
  task_id?: string | null;
  duration_minutes?: number;
  phoneNumber: string;
}

export interface UpdateAiSettingsParams {
  system_prompt?: string | null;
  is_active?: boolean;
  morning_summary_enabled?: boolean;
  morning_summary_time?: string | null;
  phoneNumber: string;
}

// ─── SSE ───────────────────────────────────────────────────────────────────

export interface SSEIntegration {
  id: string;
  api_url: string;
  api_token: string;
  instance_name: string | null;
  user_id: string;
}

export interface SSEHandle {
  close: () => void;
  connected: boolean;
  path: string | null;
}

export interface SSELogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error';
  msg: string;
}

export interface SSEStatus {
  active: boolean;
  connected: boolean;
  path: string | null;
  integrationId: string;
}

/**
 * Payload parseado de um evento SSE do WhatsApp.
 * Campos opcionais são preenchidos conforme o tipo de mensagem.
 */
export interface ParsedSSEMessage {
  phone: string;
  fromMe: boolean;
  messageId: string | null;
  contactName: string | null;
  timestamp: string | null;
  text: string;
  messageType: 'text' | 'audio' | 'image' | 'video' | 'document' | string;
  isPtt?: boolean;
  audioUrl?: string | null;
  audioKey?: unknown;
  audioMediaKey?: string | null;
  audioMimeType?: string | null;
  fileSha256?: string | null;
  imageUrl?: string | null;
  imageKey?: unknown;
  imageMediaKey?: string | null;
  rawMsg?: unknown;
}

// ─── UazAPI ────────────────────────────────────────────────────────────────

export interface UazApiConfig {
  apiUrl: string;
  apiToken: string;
  instanceName: string | null;
}

export interface SendTextMessageParams extends UazApiConfig {
  number: string;
  text: string;
}

export interface DownloadMediaParams extends UazApiConfig {
  key?: unknown;
  rawMsg?: unknown;
  mediaUrl?: string | null;
  mediaMediaKey?: string | null;
  mediaType: 'audio' | 'image' | 'video' | 'document';
  log?: (msg: string) => void;
}

export interface DownloadMediaResult {
  base64: string;
  mimetype: string;
}

export interface IntegrationRow {
  id: string;
  api_url: string;
  api_token: string;
  instance_name: string | null;
  user_id: string;
}

export interface SendAudioMessageParams {
  apiUrl: string;
  apiToken: string;
  number: string;
  audioBuffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface SendImageMessageParams {
  apiUrl: string;
  apiToken: string;
  number: string;
  imageBuffer: Buffer;
  mimeType: string;
  filename: string;
  caption?: string;
}
