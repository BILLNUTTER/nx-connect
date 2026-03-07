import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";

export function useAdminStats() {
  return useQuery({
    queryKey: [api.admin.dashboardStats.path],
    queryFn: async () => {
      const data = await apiFetch(api.admin.dashboardStats.path);
      return parseWithLogging(api.admin.dashboardStats.responses[200], data, "admin.stats");
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const data = await apiFetch(api.admin.users.path);
      return parseWithLogging(api.admin.users.responses[200], data, "admin.users");
    },
  });
}

export function useAdminPasswordRequests() {
  return useQuery({
    queryKey: [api.admin.passwordRequests.path],
    queryFn: async () => {
      const data = await apiFetch(api.admin.passwordRequests.path);
      return parseWithLogging(api.admin.passwordRequests.responses[200], data, "admin.passwordRequests");
    },
  });
}

export function useAdminActions() {
  const queryClient = useQueryClient();

  const restrictUser = useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.restrictUser.path, { id });
      await apiFetch(url, { method: "PUT" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.users.path] }),
  });

  const reactivateUser = useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.reactivateUser.path, { id });
      await apiFetch(url, { method: "PUT" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.users.path] }),
  });

  const changePassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const url = buildUrl(api.admin.changePassword.path, { id });
      await apiFetch(url, { method: "PUT", body: JSON.stringify({ password }) });
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (data: { content: string; userId?: string }) => {
      await apiFetch(api.admin.sendNotification.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });

  const resolvePassword = useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.resolvePasswordRequest.path, { id });
      await apiFetch(url, { method: "PUT" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.passwordRequests.path] }),
  });

  return { restrictUser, reactivateUser, changePassword, sendNotification, resolvePassword };
}
