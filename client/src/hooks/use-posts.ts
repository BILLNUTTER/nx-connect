import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";
import { z } from "zod";

export function usePosts() {
  return useQuery({
    queryKey: [api.posts.list.path],
    queryFn: async () => {
      const data = await apiFetch(api.posts.list.path);
      return parseWithLogging(api.posts.list.responses[200], data, "posts.list");
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const data = await apiFetch(api.posts.create.path, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return parseWithLogging(api.posts.create.responses[201], data, "posts.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.posts.like.path, { id });
      const data = await apiFetch(url, { method: "POST" });
      return parseWithLogging(api.posts.like.responses[200], data, "posts.like");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
    },
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: [api.comments.list.path, postId],
    queryFn: async () => {
      const url = buildUrl(api.comments.list.path, { postId });
      const data = await apiFetch(url);
      return parseWithLogging(api.comments.list.responses[200], data, "comments.list");
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const url = buildUrl(api.comments.create.path, { postId });
      const data = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return parseWithLogging(api.comments.create.responses[201], data, "comments.create");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, variables.postId] });
    },
  });
}
