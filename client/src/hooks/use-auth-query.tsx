import { createContext, ReactNode, useContext } from "react";
import { 
  useQuery,
  useMutation,
  UseQueryResult,
  QueryClient
} from "@tanstack/react-query";
import { User, UserWithoutPassword } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for login and register
type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  displayName: string;
};

// Auth context interface
interface AuthContextType {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
}

// Create auth context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
  isLoggedIn: false,
  login: async () => { throw new Error("Login not implemented"); },
  register: async () => { throw new Error("Register not implemented"); },
  logout: async () => { throw new Error("Logout not implemented"); }
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to fetch current user
  const {
    data: user,
    isLoading,
    error,
    refetch
  } = useQuery<UserWithoutPassword | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        console.log("Fetching user data...");
        const response = await fetch("/api/auth/user");
        console.log("User response status:", response.status);
        
        if (response.status === 401) {
          console.log("User not authenticated");
          // Clear localStorage if the server says we're not authenticated
          localStorage.removeItem('user');
          return null;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch user:", errorText);
          throw new Error("Failed to fetch user data");
        }
        
        const data = await response.json();
        console.log("User data:", data);
        
        // Store in localStorage for persistence
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          return data.user;
        }
        
        return null;
      } catch (error) {
        console.error("Error fetching user:", error);
        // Try to get from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            return JSON.parse(storedUser);
          } catch (e) {
            localStorage.removeItem('user');
          }
        }
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once to avoid spamming failed requests,
    initialData: () => {
      // Try to load initial data from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
      return null;
    },
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log("Sending login request to:", "/api/auth/login", credentials);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login error:", errorData);
        throw new Error(errorData.message || "Login failed");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Update user data in query cache and localStorage
      queryClient.setQueryData(["/api/auth/user"], data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.displayName}!`,
      });
      
      // Refetch to ensure everything is in sync
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      console.log("Sending registration request to:", "/api/auth/register", credentials);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Registration error:", errorData);
        throw new Error(errorData.message || "Registration failed");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Update user data in query cache and localStorage
      queryClient.setQueryData(["/api/auth/user"], data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({
        title: "Registration successful",
        description: `Welcome to RevocAI, ${data.user.displayName}!`,
      });
      
      // Refetch to ensure everything is in sync
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive"
      });
    }
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Sending logout request to:", "/api/auth/logout");
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Logout error:", errorData);
        throw new Error(errorData.message || "Logout failed");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Clear user data from query cache and localStorage
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem('user');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Refetch to ensure everything is in sync
      refetch();
      
      // Force reload to clear any stale state
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out",
        variant: "destructive"
      });
    }
  });
  
  // Public methods that use mutations
  const login = async (credentials: LoginCredentials) => {
    return loginMutation.mutateAsync(credentials);
  };
  
  const register = async (credentials: RegisterCredentials) => {
    return registerMutation.mutateAsync(credentials);
  };
  
  const logout = async () => {
    return logoutMutation.mutateAsync();
  };
  
  // Create the context value with proper null handling
  const contextValue: AuthContextType = {
    user: user || null,
    isLoading,
    error,
    isLoggedIn: !!user,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthQuery() {
  return useContext(AuthContext);
}