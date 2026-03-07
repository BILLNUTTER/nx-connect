import { z } from "zod";

export const getAuthToken = () => localStorage.getItem("nutterx_token");
export const setAuthToken = (token: string) => localStorage.setItem("nutterx_token", token);
export const removeAuthToken = () => localStorage.removeItem("nutterx_token");

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    removeAuthToken();
    window.dispatchEvent(new Event("auth-expired"));
    throw new Error("Unauthorized");
  }

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  
  if (!res.ok) {
    const errorData = isJson ? await res.json() : await res.text();
    throw new Error(errorData.message || errorData || "An error occurred");
  }

  if (res.status === 204) return null;
  return isJson ? res.json() : res.text();
}

export function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}
