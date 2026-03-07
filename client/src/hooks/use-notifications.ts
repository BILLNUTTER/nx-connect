import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";

export function useNotifications() {
  return useQuery({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const data = await apiFetch(api.notifications.list.path);
      return parseWithLogging(api.notifications.list.responses[200], data, "notifications.list");
    },
    refetchInterval: 10000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.notifications.markRead.path, { id });
      const data = await apiFetch(url, { method: "PUT" });
      return parseWithLogging(api.notifications.markRead.responses[200], data, "notifications.markRead");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}
