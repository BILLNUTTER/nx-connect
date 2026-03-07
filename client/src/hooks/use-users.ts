import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";

export function useDiscoverUsers() {
  return useQuery({
    queryKey: [api.users.discover.path],
    queryFn: async () => {
      const data = await apiFetch(api.users.discover.path);
      return parseWithLogging(api.users.discover.responses[200], data, "users.discover");
    },
  });
}

export function useFriends() {
  return useQuery({
    queryKey: [api.users.friends.path],
    queryFn: async () => {
      const data = await apiFetch(api.users.friends.path);
      return parseWithLogging(api.users.friends.responses[200], data, "users.friends");
    },
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: [api.users.friendRequests.path],
    queryFn: async () => {
      const data = await apiFetch(api.users.friendRequests.path);
      return parseWithLogging(api.users.friendRequests.responses[200], data, "users.friendRequests");
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.users.sendRequest.path, { id });
      await apiFetch(url, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.discover.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // update sent requests
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.users.acceptRequest.path, { id });
      await apiFetch(url, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.friendRequests.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.friends.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

export function useUnfriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.users.unfriend.path, { id });
      await apiFetch(url, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.friends.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

export function useUserProfile(id: string) {
  return useQuery({
    queryKey: [api.users.profile.path, id],
    queryFn: async () => {
      const url = buildUrl(api.users.profile.path, { id });
      const data = await apiFetch(url);
      return parseWithLogging(api.users.profile.responses[200], data, "users.profile");
    },
    enabled: !!id,
  });
}
