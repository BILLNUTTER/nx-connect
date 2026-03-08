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
    onMutate: async (postId: string) => {
      const currentUser = queryClient.getQueryData([api.auth.me.path]) as any;
      const userId = currentUser?.id;

      await queryClient.cancelQueries({ queryKey: [api.posts.list.path] });
      await queryClient.cancelQueries({ queryKey: [api.posts.get.path, postId] });

      const prevList = queryClient.getQueryData([api.posts.list.path]);
      const prevPost = queryClient.getQueryData([api.posts.get.path, postId]);

      const toggle = (post: any) => {
        if (!post || !userId) return post;
        const hasLiked = post.likes.includes(userId);
        return {
          ...post,
          likes: hasLiked
            ? post.likes.filter((id: string) => id !== userId)
            : [...post.likes, userId],
        };
      };

      queryClient.setQueryData([api.posts.list.path], (old: any) =>
        Array.isArray(old) ? old.map((p: any) => p.id === postId ? toggle(p) : p) : old
      );
      queryClient.setQueryData([api.posts.get.path, postId], toggle);

      return { prevList, prevPost, postId };
    },
    onError: (_err: any, _postId: any, context: any) => {
      if (context?.prevList !== undefined) {
        queryClient.setQueryData([api.posts.list.path], context.prevList);
      }
      if (context?.prevPost !== undefined) {
        queryClient.setQueryData([api.posts.get.path, context.postId], context.prevPost);
      }
    },
    onSuccess: (updatedPost: any) => {
      if (updatedPost?.id) {
        queryClient.setQueryData([api.posts.get.path, updatedPost.id], updatedPost);
        queryClient.setQueryData([api.posts.list.path], (old: any) =>
          Array.isArray(old) ? old.map((p: any) => p.id === updatedPost.id ? updatedPost : p) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/posts"] });
    },
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: [api.posts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.posts.get.path, { id });
      const data = await apiFetch(url);
      return parseWithLogging(api.posts.get.responses[200], data, "posts.get");
    },
    enabled: !!id,
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
