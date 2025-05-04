import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthQuery } from "@/hooks/use-auth-query";

// Login form schema (must match LoginCredentials interface in use-auth-query.tsx)
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Get authentication methods from the auth context
  const { user, login, register, isLoggedIn } = useAuthQuery();
  
  // Check if we're already logged in using the auth context
  useEffect(() => {
    // If we have a user or isLoggedIn is true, set isAuthenticated
    if (user || isLoggedIn) {
      console.log("User is already authenticated via context, redirecting to home");
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [user, isLoggedIn]);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });
  
  // Handle login form submission
  const onLoginSubmit = async (data: LoginFormValues) => {
    console.log("Login submit with:", data.email);
    setAuthError(null);
    setIsSubmitting(true);
    try {
      // First, try making a direct API call for diagnostic purposes
      console.log("Testing direct API call first");
      const { testLoginRequest } = await import('../test-auth');
      const testResult = await testLoginRequest(data.email, data.password);
      console.log("Test login result:", testResult);
      
      // Now use the normal login function from auth context
      console.log("Now trying the normal login flow");
      await login(data);
      
      // Set authenticated state to trigger redirect
      console.log("Login successful, redirecting to home page");
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle registration form submission
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    console.log("Registration submit with:", data.email);
    setAuthError(null);
    setIsSubmitting(true);
    try {
      // Use the register function from auth context
      await register(data);
      
      // Set authenticated state to trigger redirect
      console.log("Registration successful, redirecting to home page");
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Registration failed:", error);
      setAuthError(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Display an error alert if we have an auth error
  const renderAuthError = () => {
    if (!authError) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{authError}</AlertDescription>
      </Alert>
    );
  };
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  // If already authenticated via our context or local state, redirect to home
  if (isAuthenticated || isLoggedIn || user) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Auth form section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">RevocAI</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login tab */}
              <TabsContent value="login">
                {renderAuthError()}
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(data => onLoginSubmit(data))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full mb-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
                    <div className="flex justify-around text-xs pt-2">
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const { testUserRequest } = await import('../test-auth');
                            const result = await testUserRequest();
                            console.log("Test user auth result:", result);
                          } catch (error) {
                            console.error("Error testing user auth:", error);
                          }
                        }}
                        className="text-primary hover:underline text-xs"
                      >
                        Test Auth Status
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const { testLoginRequest } = await import('../test-auth');
                            const email = loginForm.getValues('email');
                            const password = loginForm.getValues('password');
                            if (email && password) {
                              const result = await testLoginRequest(email, password);
                              console.log("Direct login result:", result);
                            } else {
                              console.error("Please enter email and password first");
                            }
                          } catch (error) {
                            console.error("Error testing direct login:", error);
                          }
                        }}
                        className="text-primary hover:underline text-xs"
                      >
                        Test Direct Login
                      </button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Register tab */}
              <TabsContent value="register">
                {renderAuthError()}
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(data => onRegisterSubmit(data))} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full mb-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating account..." : "Create account"}
                    </Button>
                    <div className="flex justify-around text-xs pt-2">
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const { testUserRequest } = await import('../test-auth');
                            const result = await testUserRequest();
                            console.log("Test user auth result:", result);
                          } catch (error) {
                            console.error("Error testing user auth:", error);
                          }
                        }}
                        className="text-primary hover:underline text-xs"
                      >
                        Test Auth Status
                      </button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Hero section - only shown on larger screens */}
      <div className="hidden md:flex flex-1 bg-gradient-to-r from-primary/10 to-primary/30 flex-col justify-center items-center text-center p-8">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Your AI Conversation Assistant
          </h1>
          <p className="text-xl mb-6">
            Record, transcribe, and manage your conversations with intelligent contact detection and AI-powered insights.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/10 rounded-lg">
              <h3 className="font-semibold mb-2">Voice Recording</h3>
              <p className="text-sm">Capture conversations with high-quality voice recording</p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <h3 className="font-semibold mb-2">AI Transcription</h3>
              <p className="text-sm">Convert speech to text with advanced AI accuracy</p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <h3 className="font-semibold mb-2">Contact Management</h3>
              <p className="text-sm">Auto-detect and organize contacts mentioned in conversations</p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <h3 className="font-semibold mb-2">Calendar Integration</h3>
              <p className="text-sm">Extract events and reminders from your discussions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}