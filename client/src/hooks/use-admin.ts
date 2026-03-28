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

export function useAdminPosts() {
  return useQuery({
    queryKey: [api.admin.allPosts.path],
    queryFn: async () => {
      const data = await apiFetch(api.admin.allPosts.path);
      return parseWithLogging(api.admin.allPosts.responses[200], data, "admin.allPosts");
    },
  });
}

export function useAdminProfile() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [api.admin.getProfile.path],
    queryFn: async () => {
      const data = await apiFetch(api.admin.getProfile.path);
      return parseWithLogging(api.admin.getProfile.responses[200], data, "admin.profile");
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { profilePicture?: string; name?: string }) => {
      const data = await apiFetch(api.admin.updateProfile.path, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.getProfile.path] }),
  });

  return { ...query, updateProfile };
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
    mutationFn: async ({ id, password }: { id: string; password: string }): Promise<{ message: string; phone?: string }> => {
      const url = buildUrl(api.admin.resolvePasswordRequest.path, { id });
      const data = await apiFetch(url, { method: "PUT", body: JSON.stringify({ password }) });
      return data as { message: string; phone?: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.passwordRequests.path] }),
  });

  const sendChat = useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }) => {
      const url = buildUrl(api.admin.sendChat.path, { userId });
      await apiFetch(url, { method: "POST", body: JSON.stringify({ content }) });
    },
  });

  const createAdminPost = useMutation({
    mutationFn: async (content: string) => {
      const data = await apiFetch(api.admin.createPost.path, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.allPosts.path] });
    },
  });

  const adminDeletePost = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const url = buildUrl(api.admin.deletePost.path, { id });
      await apiFetch(url, { method: "DELETE", body: JSON.stringify({ reason }), headers: { "Content-Type": "application/json" } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.allPosts.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.posts.path] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.deleteUser.path, { id });
      await apiFetch(url, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.dashboardStats.path] });
    },
  });

  const verifyUser = useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.admin.verifyUser.path, { id });
      const data = await apiFetch(url, { method: "PATCH" });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.admin.users.path] }),
  });

  return { restrictUser, reactivateUser, deleteUser, changePassword, sendNotification, resolvePassword, sendChat, createAdminPost, adminDeletePost, verifyUser };
}
