import { useState, useCallback, useEffect } from "react";
import {
  listTaskGroups,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  upsertTaskSlot,
  removeTaskSlot,
} from "../api";
import type { TaskGroup } from "../data/types";

export interface UseTaskGroupsResult {
  groups: TaskGroup[];
  isLoading: boolean;
  createGroup: (name: string, color?: string) => Promise<void>;
  updateGroup: (id: string, data: { name?: string; color?: string | null }) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  assignTask: (
    groupId: string,
    position: number,
    projectId: string,
    taskId: string,
  ) => Promise<void>;
  removeTask: (groupId: string, position: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTaskGroups(): UseTaskGroupsResult {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { groups: fetched } = await listTaskGroups();
      setGroups(fetched);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreateGroup = useCallback(
    async (name: string, color?: string) => {
      try {
        await createTaskGroup(name, color);
        await refresh();
      } catch {
        // silently ignore
      }
    },
    [refresh],
  );

  const handleUpdateGroup = useCallback(
    async (id: string, data: { name?: string; color?: string | null }) => {
      try {
        await updateTaskGroup(id, data);
        await refresh();
      } catch {
        // silently ignore
      }
    },
    [refresh],
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      try {
        await deleteTaskGroup(id);
        await refresh();
      } catch {
        // silently ignore
      }
    },
    [refresh],
  );

  const handleAssignTask = useCallback(
    async (
      groupId: string,
      position: number,
      projectId: string,
      taskId: string,
    ) => {
      try {
        await upsertTaskSlot(groupId, {
          position,
          project_id: projectId,
          task_id: taskId,
        });
        await refresh();
      } catch {
        // silently ignore
      }
    },
    [refresh],
  );

  const handleRemoveTask = useCallback(
    async (groupId: string, position: number) => {
      try {
        await removeTaskSlot(groupId, position);
        await refresh();
      } catch {
        // silently ignore
      }
    },
    [refresh],
  );

  return {
    groups,
    isLoading,
    createGroup: handleCreateGroup,
    updateGroup: handleUpdateGroup,
    deleteGroup: handleDeleteGroup,
    assignTask: handleAssignTask,
    removeTask: handleRemoveTask,
    refresh,
  };
}
