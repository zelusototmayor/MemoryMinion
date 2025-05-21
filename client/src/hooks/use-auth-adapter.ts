import { UserWithoutPassword } from "@shared/schema";
import { useSupabaseAuth } from "./use-supabase-auth";

// Define the credential types to match the existing interface
type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  displayName: string;
};

/**
 * This adapter hook provides the same interface as the original useAuth hook
 * but uses Supabase authentication underneath.
 */
export function useAuth() {
  const { 
    user, 
    isLoading, 
    signIn, 
    signUp, 
    signOut, 
    isLoggedIn 
  } = useSupabaseAuth();
  
  // Transform the Supabase user to match our app's UserWithoutPassword type if available
  const adaptedUser: UserWithoutPassword | null = user ? {
    id: parseInt(user.id) || 1, // Fallback to 1 if not a valid integer
    email: user.email || "",
    displayName: user.user_metadata?.display_name || user.email || "User",
    role: user.user_metadata?.role || "user",
    created_at: user.created_at ? new Date(user.created_at) : null
  } : null;
  
  return {
    user: adaptedUser,
    isLoading,
    error: null, // We simplify error handling in the adapter
    isLoggedIn,
    
    // Provide mutation-like objects for compatibility with existing code
    loginMutation: {
      isPending: isLoading,
      isSuccess: !!user,
      isError: false,
      mutate: (data: LoginCredentials) => { signIn(data.email, data.password) },
      mutateAsync: async (data: LoginCredentials) => { 
        await signIn(data.email, data.password);
        return adaptedUser!;
      }
    },
    
    logoutMutation: {
      isPending: isLoading,
      isSuccess: !user,
      isError: false,
      mutate: () => { signOut() },
      mutateAsync: async () => { await signOut() }
    },
    
    registerMutation: {
      isPending: isLoading,
      isSuccess: false,
      isError: false,
      mutate: (data: RegisterCredentials) => { 
        signUp(data.email, data.password, { displayName: data.displayName }) 
      },
      mutateAsync: async (data: RegisterCredentials) => {
        await signUp(data.email, data.password, { displayName: data.displayName });
        return adaptedUser!;
      }
    }
  };
}