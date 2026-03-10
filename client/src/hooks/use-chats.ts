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
    staleTime: 2000,
    gcTime: 15 * 60 * 1000,
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
    refetchInterval: 1500,
    staleTime: 30 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, replyTo }: { conversationId: string; content: string; replyTo?: string; currentUserId?: string }) => {
      const url = buildUrl(api.chats.sendMessage.path, { conversationId });
      const data = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ content, ...(replyTo ? { replyTo } : {}) }),
      });
      return parseWithLogging(api.chats.sendMessage.responses[201], data, "chats.sendMessage");
    },
    onMutate: async ({ conversationId, content, currentUserId }) => {
      await queryClient.cancelQueries({ queryKey: [api.chats.messages.path, conversationId] });
      const prev = queryClient.getQueryData<any[]>([api.chats.messages.path, conversationId]);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: currentUserId || '',
        content,
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
