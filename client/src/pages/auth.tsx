import { useState } from "react";
import { Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/use-auth-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

// Login form schema
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
  
  // Use try-catch to handle cases where useAuthQuery isn't available
  let user = null;
  let isLoading = false;
  let login = async (credentials: any) => {
    console.log("Login not available");
  };
  let register = async (credentials: any) => {
    console.log("Register not available");
  };
  
  try {
    const auth = useAuthQuery();
    user = auth.user;
    isLoading = auth.isLoading;
    login = auth.login;
    register = auth.register;
  } catch (error) {
    console.log("Auth not available yet");
  }
  
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
  
  // Login handler
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data);
    } catch (error) {
      console.error("Login failed:", error);
      // Error is handled in the login function
    }
  };
  
  // Registration handler
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      await register(data);
    } catch (error) {
      console.error("Registration failed:", error);
      // Error is handled in the register function
    }
  };
  
  // Redirect to home if already logged in
  if (user) {
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
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
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
                      className="w-full"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Register tab */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                      className="w-full"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting ? "Creating account..." : "Create account"}
                    </Button>
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