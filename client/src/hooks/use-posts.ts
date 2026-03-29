import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch, parseWithLogging } from "@/lib/api";
import { z } from "zod";
import { playLike, playCommentSent } from "@/lib/sounds";

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
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const data = await apiFetch(api.posts.create.path, {
        method: "POST",
        body: JSON.stringify({ content, imageUrl }),
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

      // Play sound only when liking (not unliking)
      const currentList = queryClient.getQueryData<any[]>([api.posts.list.path]);
      const postInList = currentList?.find((p: any) => p.id === postId);
      if (userId && postInList && !postInList.likes.includes(userId)) {
        playLike();
      }

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
        queryClient.setQueryData([api.posts.get.path, updatedPost.id], (old: any) =>
          old ? { ...old, likes: updatedPost.likes } : old
        );
        queryClient.setQueryData([api.posts.list.path], (old: any) =>
          Array.isArray(old) ? old.map((p: any) => p.id === updatedPost.id ? { ...p, likes: updatedPost.likes } : p) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.posts.delete.path, { id });
      await apiFetch(url, { method: "DELETE" });
      return id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.setQueryData([api.posts.list.path], (old: any) =>
        Array.isArray(old) ? old.filter((p: any) => p.id !== deletedId) : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/users/posts"] });
    },
  });
}

export function useHidePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.posts.hide.path, { id });
      const data = await apiFetch(url, { method: "PATCH" });
      return parseWithLogging(api.posts.hide.responses[200], data, "posts.hide");
    },
    onSuccess: (updatedPost: any) => {
      if (updatedPost?.id) {
        queryClient.setQueryData([api.posts.get.path, updatedPost.id], (old: any) =>
          old ? { ...old, hidden: updatedPost.hidden } : old
        );
        queryClient.setQueryData([api.posts.list.path], (old: any) =>
          Array.isArray(old) ? old.map((p: any) => p.id === updatedPost.id ? { ...p, hidden: updatedPost.hidden } : p) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/posts"] });
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
    },
  });
}

export function usePost(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.posts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.posts.get.path, { id });
      const data = await apiFetch(url);
      return parseWithLogging(api.posts.get.responses[200], data, "posts.get");
    },
    enabled: !!id,
    initialData: () => {
      const list = queryClient.getQueryData<any[]>([api.posts.list.path]);
      return list?.find((p: any) => p.id === id);
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState([api.posts.list.path])?.dataUpdatedAt;
    },
    staleTime: 10_000,
  });
}

export function usePrefetchPost() {
  const queryClient = useQueryClient();
  return (id: string) => {
    if (queryClient.getQueryData([api.posts.get.path, id])) return;
    queryClient.prefetchQuery({
      queryKey: [api.posts.get.path, id],
      queryFn: async () => {
        const url = buildUrl(api.posts.get.path, { id });
        const data = await apiFetch(url);
        return parseWithLogging(api.posts.get.responses[200], data, "posts.get");
      },
      staleTime: 10_000,
    });
  };
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
    mutationFn: async ({ postId, content, replyTo }: { postId: string; content: string; replyTo?: string }) => {
      const url = buildUrl(api.comments.create.path, { postId });
      const data = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ content, ...(replyTo ? { replyTo } : {}) }),
      });
      return parseWithLogging(api.comments.create.responses[201], data, "comments.create");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, variables.postId] });
      playCommentSent();
    },
  });
}

export function useLikeComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const data = await apiFetch(`/api/posts/${postId}/comments/${commentId}/like`, { method: "POST" });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, variables.postId] });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const url = buildUrl(api.posts.edit.path, { id });
      const data = await apiFetch(url, { method: "PATCH", body: JSON.stringify({ content }) });
      return data;
    },
    onSuccess: (updated: any) => {
      if (updated?.id) {
        queryClient.setQueryData([api.posts.get.path, updated.id], (old: any) =>
          old ? { ...old, content: updated.content, updatedAt: updated.updatedAt } : old
        );
        queryClient.setQueryData([api.posts.list.path], (old: any) =>
          Array.isArray(old) ? old.map((p: any) => p.id === updated.id ? { ...p, content: updated.content, updatedAt: updated.updatedAt } : p) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/posts"] });
    },
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, commentId, content }: { postId: string; commentId: string; content: string }) => {
      const url = buildUrl(api.comments.edit.path, { postId, commentId });
      const data = await apiFetch(url, { method: "PATCH", body: JSON.stringify({ content }) });
      return { ...data, postId };
    },
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, updated.postId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const url = buildUrl(api.comments.delete.path, { postId, commentId });
      await apiFetch(url, { method: "DELETE" });
      return { postId, commentId };
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, postId] });
    },
  });
}
