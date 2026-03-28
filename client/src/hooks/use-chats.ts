import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";

export { api, buildUrl, apiFetch, parseWithLogging };

export function useConversations() {
  return useQuery({
    queryKey: [api.chats.conversations.path],
    queryFn: async () => {
      const data = await apiFetch(api.chats.conversations.path);
      return parseWithLogging(api.chats.conversations.responses[200], data, "chats.conversations");
    },
    refetchInterval: 4000,
    staleTime: 4000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const url = buildUrl(api.chats.getOrCreate.path, { userId });
      const data = await apiFetch(url, { method: "POST" });
      return parseWithLogging(api.chats.getOrCreate.responses[200], data, "chats.getOrCreate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: [api.chats.messages.path, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.chats.messages.path, { conversationId });
      const data = await apiFetch(url);
      return parseWithLogging(api.chats.messages.responses[200], data, "chats.messages");
    },
    enabled: !!conversationId,
    refetchInterval: 2500,
    staleTime: 2500,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, replyTo, audioUrl }: { conversationId: string; content?: string; replyTo?: string; currentUserId?: string; audioUrl?: string }) => {
      const url = buildUrl(api.chats.sendMessage.path, { conversationId });
      const data = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({
          content: content || "",
          ...(replyTo ? { replyTo } : {}),
          ...(audioUrl ? { audioUrl } : {}),
        }),
      });
      return parseWithLogging(api.chats.sendMessage.responses[201], data, "chats.sendMessage");
    },
    onMutate: async ({ conversationId, content, audioUrl, currentUserId }) => {
      await queryClient.cancelQueries({ queryKey: [api.chats.messages.path, conversationId] });
      const prev = queryClient.getQueryData<any[]>([api.chats.messages.path, conversationId]);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: currentUserId || '',
        content: content || (audioUrl ? "🎙 Voice note" : ""),
        audioUrl: audioUrl || null,
        readBy: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData(
        [api.chats.messages.path, conversationId],
        (old: any[]) => [...(old || []), optimistic]
      );
      return { prev, conversationId };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData([api.chats.messages.path, context.conversationId], context.prev);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chats.messages.path, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId, content }: { conversationId: string; messageId: string; content: string }) => {
      const url = buildUrl(api.chats.editMessage.path, { conversationId, messageId });
      const data = await apiFetch(url, { method: "PATCH", body: JSON.stringify({ content }) });
      return { ...data, conversationId };
    },
    onSuccess: (updated: any) => {
      queryClient.setQueryData([api.chats.messages.path, updated.conversationId], (old: any[]) =>
        Array.isArray(old) ? old.map(m => m.id === updated.id ? { ...m, content: updated.content, updatedAt: updated.updatedAt } : m) : old
      );
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      const url = buildUrl(api.chats.deleteMessage.path, { conversationId, messageId });
      await apiFetch(url, { method: "DELETE" });
      return { conversationId, messageId };
    },
    onSuccess: ({ conversationId, messageId }) => {
      queryClient.setQueryData([api.chats.messages.path, conversationId], (old: any[]) =>
        Array.isArray(old) ? old.filter(m => m.id !== messageId) : old
      );
    },
  });
}

export function useSetDisappearingMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, duration }: { conversationId: string; duration: "off" | "24h" | "7d" }) => {
      const data = await apiFetch(`/api/chats/${conversationId}/disappearing`, {
        method: "PATCH",
        body: JSON.stringify({ duration }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}
