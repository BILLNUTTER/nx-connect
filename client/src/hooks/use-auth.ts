import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch, parseWithLogging, setAuthToken, removeAuthToken } from "@/lib/api";
import { z } from "zod";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      try {
        const data = await apiFetch(api.auth.me.path);
        return parseWithLogging(api.auth.me.responses[200], data, "auth.me");
      } catch (err) {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof api.auth.login.input>) => {
      const data = await apiFetch(api.auth.login.path, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      const parsed = parseWithLogging(api.auth.login.responses[200], data, "auth.login");
      setAuthToken(parsed.token);
      return parsed.user;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData([api.auth.me.path], userData);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof api.auth.signup.input>) => {
      const data = await apiFetch(api.auth.signup.path, {
        method: "POST",
        body: JSON.stringify(userData),
      });
      const parsed = parseWithLogging(api.auth.signup.responses[201], data, "auth.signup");
      setAuthToken(parsed.token);
      return parsed.user;
    },
    onSuccess: (userData) => {
      queryClient.setQueryData([api.auth.me.path], userData);
    },
  });

  const logout = () => {
    removeAuthToken();
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear();
    window.location.href = "/";
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (profilePicture: string) => {
      const data = await apiFetch(api.auth.updateProfile.path, {
        method: "PUT",
        body: JSON.stringify({ profilePicture }),
      });
      return parseWithLogging(api.auth.updateProfile.responses[200], data, "auth.updateProfile");
    },
    onSuccess: (userData) => {
      queryClient.setQueryData([api.auth.me.path], userData);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (req: { username: string; desiredPassword: string }) => {
      await apiFetch(api.auth.forgotPassword.path, {
        method: "POST",
        body: JSON.stringify(req),
      });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout,
    updateProfile: updateProfileMutation.mutateAsync,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
  };
}
