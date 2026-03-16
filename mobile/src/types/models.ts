export type TaskStatus = 'pending' | 'completed';

export interface Project {
  id: string;
  name: string;
  color?: string | null;
}

export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  theme_color?: string | null;
  role?: 'admin' | 'collaborator' | null;
  phone?: string | null;
}

export interface TaskCreator {
  full_name: string;
  theme_color?: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  due_date?: string | null;
  description?: string | null;
  priority?: number | null;
  creator_id?: string;
  creator?: TaskCreator | null;
  project_id?: string | null;
  project?: Project | null;
}

export interface DashboardStats {
  today: number;
  upcoming: number;
  inbox: number;
}
