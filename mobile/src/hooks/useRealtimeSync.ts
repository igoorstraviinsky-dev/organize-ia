import { useRealtimeTables } from './useRealtimeTables';

const REALTIME_TABLES = ['tasks', 'projects', 'profiles', 'sections', 'assignments', 'labels', 'task_labels'];

export function useRealtimeSync(onUpdate: () => void) {
  useRealtimeTables(REALTIME_TABLES, onUpdate);
}
