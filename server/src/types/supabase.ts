// Interfaces das entidades do banco de dados Supabase
// Derivadas do schema de database/ e da documentação em conversaia.md
// REGRA: due_date e due_time são SEMPRE string | null, nunca Date objects.
// Isso garante que o timezone BRT seja preservado sem conversão silenciosa.

export type UserRole = 'admin' | 'collaborator';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 1 | 2 | 3 | 4;
export type MessageDirection = 'in' | 'out';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  theme_color: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Formato: 'YYYY-MM-DD' — nunca usar Date object para preservar timezone BRT */
  due_date: string | null;
  /** Formato: 'HH:MM' */
  due_time: string | null;
  project_id: string | null;
  section_id: string | null;
  parent_id: string | null;
  creator_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  color: string | null;
  theme_color: string | null;
  theme_gradient: string | null;
  description: string | null;
  created_at?: string;
}

export interface Section {
  id: string;
  title: string;
  project_id: string;
  position: number;
  created_at?: string;
}

export interface Assignment {
  task_id: string;
  user_id: string;
  created_at?: string;
}

export interface Label {
  id: string;
  name: string;
  owner_id: string;
  color: string | null;
  created_at?: string;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role?: string;
  created_at?: string;
}

export interface Integration {
  id: string;
  user_id: string;
  provider: string;
  api_url: string | null;
  api_token: string | null;
  instance_name: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface AiAgentSettings {
  id: string;
  user_id: string;
  openai_api_key: string | null;
  system_prompt: string | null;
  is_active: boolean;
  morning_summary_enabled: boolean;
  morning_summary_times: string[];
  created_at?: string;
}

export interface ChatMessage {
  id?: string;
  integration_id: string;
  user_id: string;
  phone: string;
  contact_name: string | null;
  direction: MessageDirection;
  body: string;
  message_id: string | null;
  message_type?: string;
  status: 'read' | 'sent' | 'pending';
  created_at?: string;
}

export interface WhatsappUser {
  id: string;
  user_id: string;
  phone: string;
  instance_name: string | null;
  created_at?: string;
}
