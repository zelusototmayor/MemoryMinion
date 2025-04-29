import { useAuthQuery } from "./use-auth-query";

// Forward all auth operations to useAuthQuery
export function useAuth() {
  const { user, isLoading, error, login, register, logout } = useAuthQuery();
  
  // Provide same interface but using our real auth implementation
  return {
    user,
    isLoading,
    error,
    // Map the simple functions to "mutation-like" objects for compatibility
    loginMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: (data) => { login(data) },
      mutateAsync: async (data) => { 
        await login(data);
        return user;
      }
    },
    logoutMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: () => { logout() },
      mutateAsync: async () => { await logout() }
    },
    registerMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: (data) => { register(data) },
      mutateAsync: async (data) => {
        await register(data);
        return user;
      }
    }
  };
}