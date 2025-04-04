import { createContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "./queryClient";
import { User, UserWithoutPassword } from "@shared/schema";

type AuthContextType = {
  user: UserWithoutPassword | null;
  login: (email: string, password: string) => Promise<UserWithoutPassword>;
  register: (email: string, password: string, displayName: string) => Promise<UserWithoutPassword>;
  logout: () => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {
    throw new Error("Not implemented");
  },
  register: async () => {
    throw new Error("Not implemented");
  },
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithoutPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for authenticated user session on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // Clear any stored user if the server says we're not authenticated
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user session:", error);
        // For any error, assume user is not authenticated
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        // Always set loading to false, even on errors
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<UserWithoutPassword> => {
    console.log("Logging in user:", { email });
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });
      
      const data = await response.json();
      console.log("Login response:", data);
      
      if (!data.user) {
        throw new Error(data.message || "Login failed");
      }
      
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
  ): Promise<UserWithoutPassword> => {
    console.log("Registering user:", { email, displayName });
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        displayName,
      });
      
      const data = await response.json();
      console.log("Registration response:", data);
      
      if (!data.user) {
        throw new Error(data.message || "Registration failed");
      }
      
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
