import { UserWithoutPassword } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

// Define the credential types to match the existing interface
type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  displayName: string;
};

/**
 * This hook provides direct access to Supabase authentication
 * with an interface compatible with the original useAuth hook.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Initialize auth state from Supabase on mount
  useEffect(() => {
    // Get current session
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } catch (error) {
        console.error("Error fetching auth session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Transform the Supabase user to match our app's UserWithoutPassword type if available
  const adaptedUser: UserWithoutPassword | null = user ? {
    id: parseInt(user.id) || 1, // Fallback to 1 if not a valid integer
    email: user.email || "",
    displayName: user.user_metadata?.display_name || user.email || "User",
    role: user.user_metadata?.role || "user",
    created_at: user.created_at ? new Date(user.created_at) : null
  } : null;
  
  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data.user;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Failed to login",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (email: string, password: string, userData: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.displayName,
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Registration successful",
        description: "Please check your email to confirm your account",
      });
      
      return data.user;
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any local user data to ensure the account doesn't have mockup data
      localStorage.removeItem('user');
      
      return true;
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    user: adaptedUser,
    isLoading,
    error: null, // We simplify error handling in the adapter
    isLoggedIn: !!user,
    
    // Provide mutation-like objects for compatibility with existing code
    loginMutation: {
      isPending: isLoading,
      isSuccess: !!user,
      isError: false,
      mutate: (data: LoginCredentials) => { login(data.email, data.password) },
      mutateAsync: async (data: LoginCredentials) => { 
        await login(data.email, data.password);
        return adaptedUser!;
      }
    },
    
    logoutMutation: {
      isPending: isLoading,
      isSuccess: !user,
      isError: false,
      mutate: () => { logout() },
      mutateAsync: async () => { await logout() }
    },
    
    registerMutation: {
      isPending: isLoading,
      isSuccess: false,
      isError: false,
      mutate: (data: RegisterCredentials) => { 
        register(data.email, data.password, { displayName: data.displayName }) 
      },
      mutateAsync: async (data: RegisterCredentials) => {
        await register(data.email, data.password, { displayName: data.displayName });
        return adaptedUser!;
      }
    }
  };
}