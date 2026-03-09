import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { groupName: string; groupPhoto?: string; memberIds: string[] }) => {
      return await apiFetch('/api/groups', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupName, groupPhoto }: { id: string; groupName?: string; groupPhoto?: string }) => {
      return await apiFetch(`/api/groups/${id}`, { method: 'PUT', body: JSON.stringify({ groupName, groupPhoto }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      return await apiFetch(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      return await apiFetch(`/api/groups/leave/${groupId}`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useGroupByToken(token: string | null) {
  return useQuery({
    queryKey: ['/api/groups/join', token],
    queryFn: async () => {
      if (!token) return null;
      return await apiFetch(`/api/groups/join/${token}`);
    },
    enabled: !!token,
    retry: false,
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      return await apiFetch(`/api/groups/join/${token}`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}
