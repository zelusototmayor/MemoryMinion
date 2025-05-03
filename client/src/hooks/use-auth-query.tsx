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
}

// Create auth context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
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
    error
  } = useQuery<UserWithoutPassword | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        console.log("Fetching user data...");
        const response = await fetch("/api/auth/user");
        console.log("User response status:", response.status);
        
        if (response.status === 401) {
          console.log("User not authenticated");
          return null;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch user:", errorText);
          throw new Error("Failed to fetch user data");
        }
        
        const data = await response.json();
        console.log("User data:", data);
        return data.user || null;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once to avoid spamming failed requests
  });
  
  // Login mutation
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      const data = await response.json();
      
      // Update user data in query cache
      queryClient.setQueryData(["/api/auth/user"], data.user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.displayName}!`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: (error as Error).message || "Invalid credentials",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Register mutation
  const register = async (credentials: RegisterCredentials) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      const data = await response.json();
      
      // Update user data in query cache
      queryClient.setQueryData(["/api/auth/user"], data.user);
      
      toast({
        title: "Registration successful",
        description: `Welcome to RevocAI, ${data.user.displayName}!`,
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: (error as Error).message || "Could not create account",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Logout mutation
  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Logout failed");
      }
      
      // Clear user data from query cache
      queryClient.setQueryData(["/api/auth/user"], null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: (error as Error).message || "Could not log out",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Create the context value with proper null handling
  const contextValue: AuthContextType = {
    user: user || null,
    isLoading,
    error,
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