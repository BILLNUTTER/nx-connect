import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiFetch } from "@/lib/api";
import type { DailyPhoto, InsertDailyPhoto } from "@shared/schema";

export function usePhotos() {
  return useQuery<DailyPhoto[]>({
    queryKey: ["/api/photos"],
    queryFn: () => apiFetch("/api/photos"),
  });
}

export function useMyTodayPhoto() {
  return useQuery<{ hasPosted: boolean; photo?: DailyPhoto }>({
    queryKey: ["/api/photos/my-today"],
    queryFn: () => apiFetch("/api/photos/my-today"),
  });
}

export function useCreatePhoto() {
  return useMutation({
    mutationFn: (data: InsertDailyPhoto) =>
      apiFetch("/api/photos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos/my-today"] });
    },
  });
}

export function useDeletePhoto() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos/my-today"] });
    },
  });
}
