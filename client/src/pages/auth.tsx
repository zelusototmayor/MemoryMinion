import { useState } from "react";
import { useAuthQuery } from "@/hooks/use-auth-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerFormSchema = loginFormSchema.extend({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { loginMutation, registerMutation, user } = useAuthQuery();
  const { toast } = useToast();
  
  // Redirect if already logged in
  if (user) {
    window.location.href = "/";
    return null;
  }

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      console.log("Login form submitted:", values);
      await loginMutation.mutateAsync({
        email: values.email,
        password: values.password
      });
      toast({
        title: "Login Successful",
        description: "You have been logged in successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Login error in form handler:", error);
      toast({
        title: "Login Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      console.log("Form submitted:", values);
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        displayName: values.displayName
      });
      toast({
        title: "Registration Successful",
        description: "Your account has been created successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Registration error in form handler:", error);
      toast({
        title: "Registration Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">RevocAI</h1>
          <p className="text-gray-600 dark:text-gray-400">Your personal conversation assistant</p>
        </div>

        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">{isLogin ? "Sign In" : "Create Account"}</h2>
            
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
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
                    className="w-full bg-primary text-white" 
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
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
                    className="w-full bg-primary text-white" 
                    disabled={registerForm.formState.isSubmitting}
                  >
                    {registerForm.formState.isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Button 
            variant="link" 
            className="p-0 text-primary hover:text-primary/90 font-medium"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </Button>
        </p>
      </div>
    </div>
  );
}
