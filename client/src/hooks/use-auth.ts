import * as React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

// Define user type locally to avoid import issues
type UserWithoutPassword = {
  id: number;
  email: string;
  displayName: string;
  created_at: Date | null;
};

type AuthContextType = {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithoutPassword, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithoutPassword, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  displayName: string;
};

export const AuthContext = React.createContext<AuthContextType | null>(null);

// Simplified auth provider until JSX issues are fixed
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Return children for now - disable auth for initial implementation
  return children;
}

export function useAuth() {
  // Mock auth data for development until auth is fully implemented
  return {
    user: {
      id: 1,
      email: "user@example.com",
      displayName: "Test User",
      created_at: new Date()
    },
    isLoading: false,
    error: null,
    loginMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: () => {},
      mutateAsync: async () => ({ id: 1, email: "user@example.com", displayName: "Test User", created_at: new Date() })
    },
    logoutMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: () => {},
      mutateAsync: async () => {}
    },
    registerMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: () => {},
      mutateAsync: async () => ({ id: 1, email: "user@example.com", displayName: "Test User", created_at: new Date() })
    }
  } as AuthContextType;
}