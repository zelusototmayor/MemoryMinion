// A simple mock auth hook for development

// Mock user object
export const mockUser = {
  id: 1,
  email: "user@example.com",
  displayName: "Test User",
  created_at: new Date()
};

// A simple hook to return the mock user
export function useMockAuth() {
  return {
    user: mockUser,
    logout: () => console.log("Mock logout called"),
    isLoading: false
  };
}