import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";

export function useConversations() {
  return useQuery({
    queryKey: [api.chats.conversations.path],
    queryFn: async () => {
      const data = await apiFetch(api.chats.conversations.path);
      return parseWithLogging(api.chats.conversations.responses[200], data, "chats.conversations");
    },
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
    refetchInterval: 3000, // simple polling for chat
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const url = buildUrl(api.chats.sendMessage.path, { conversationId });
      const data = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return parseWithLogging(api.chats.sendMessage.responses[201], data, "chats.sendMessage");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chats.messages.path, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.chats.conversations.path] });
    },
  });
}
