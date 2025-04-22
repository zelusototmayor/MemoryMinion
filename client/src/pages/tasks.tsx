import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@shared/schema";
import Header from "@/components/header";
import { useState } from "react";
import { format, parseISO, isToday, isYesterday, isTomorrow, isBefore } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TasksPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all tasks
  const { 
    data: allTasksData, 
    isLoading: isLoadingAllTasks, 
    isError: isErrorAllTasks 
  } = useQuery<{ tasks: Task[] }>({
    queryKey: ["/api/tasks"],
    queryFn: () => fetch("/api/tasks").then((res) => res.json()),
  });
  
  // Fetch pending tasks
  const { 
    data: pendingTasksData, 
    isLoading: isLoadingPendingTasks, 
    isError: isErrorPendingTasks 
  } = useQuery<{ tasks: Task[] }>({
    queryKey: ["/api/tasks", "pending"],
    queryFn: () => fetch("/api/tasks?filter=pending").then((res) => res.json()),
  });
  
  // Fetch completed tasks
  const { 
    data: completedTasksData, 
    isLoading: isLoadingCompletedTasks, 
    isError: isErrorCompletedTasks 
  } = useQuery<{ tasks: Task[] }>({
    queryKey: ["/api/tasks", "completed"],
    queryFn: () => fetch("/api/tasks?filter=completed").then((res) => res.json()),
  });
  
  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/complete`);
      if (!response.ok) {
        throw new Error("Failed to complete task");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all task queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", "completed"] });
      
      toast({
        title: "Task completed",
        description: "The task has been marked as complete.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete task: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("DELETE", `/api/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to delete task");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all task queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", "completed"] });
      
      toast({
        title: "Task deleted",
        description: "The task has been permanently deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete task: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    
    const date = parseISO(dateString);
    
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    
    return format(date, "EEE, MMM d, yyyy");
  };
  
  
  
  // Check if a task is overdue
  const isTaskOverdue = (task: Task) => {
    if (!task.due_date) return false;
    
    const dueDate = parseISO(task.due_date);
    return !task.completed && isBefore(dueDate, new Date());
  };
  
  // Render task card
  const renderTaskCard = (task: Task) => (
    <div 
      key={task.id} 
      className={`p-4 rounded-lg border ${isTaskOverdue(task) ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          {!task.completed && (
            <Checkbox 
              id={`task-${task.id}`}
              className="mt-1"
              checked={task.completed}
              onCheckedChange={() => completeTaskMutation.mutate(task.id)}
            />
          )}
          <div>
            <h3 className={`text-lg font-medium ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
              {task.title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {task.due_date && (
                <Badge variant="outline" className={isTaskOverdue(task) ? 'text-red-600 dark:text-red-400' : ''}>
                  <span className="material-icons text-sm mr-1">event</span>
                  {formatDate(task.due_date)}
                </Badge>
              )}
              {task.assigned_to && (
                <Badge variant="outline">
                  <span className="material-icons text-sm mr-1">person</span>
                  {task.assigned_to}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="material-icons text-lg">edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Task</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteTaskMutation.mutate(task.id)}
                >
                  <span className="material-icons text-lg">delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Task</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <p className={`mt-2 ${task.completed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
        {task.description}
      </p>
    </div>
  );
  
  const isLoading = isLoadingAllTasks || isLoadingPendingTasks || isLoadingCompletedTasks;
  const isError = isErrorAllTasks || isErrorPendingTasks || isErrorCompletedTasks;
  
  const allTasks = allTasksData?.tasks || [];
  const pendingTasks = pendingTasksData?.tasks || [];
  const completedTasks = completedTasksData?.tasks || [];
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tasks
          </h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="hidden sm:flex"
            >
              <span className="material-icons text-sm mr-1">arrow_back</span>
              Back
            </Button>
            <Button size="sm">
              <span className="material-icons text-sm mr-1">add</span>
              New Task
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-xs" />
            <div className="space-y-2">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">Failed to load tasks.</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">{allTasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                <Badge variant="secondary" className="ml-2">{pendingTasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-2">{completedTasks.length}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {allTasks.length > 0 ? (
                allTasks.map(renderTaskCard)
              ) : (
                <div className="text-center py-12">
                  <div className="material-icons mb-2 text-gray-400 text-4xl">task_alt</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No tasks found</p>
                  <Button size="sm">
                    <span className="material-icons text-sm mr-1">add</span>
                    Create Your First Task
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.map(renderTaskCard)
              ) : (
                <div className="text-center py-12">
                  <div className="material-icons mb-2 text-gray-400 text-4xl">check_circle</div>
                  <p className="text-gray-500 dark:text-gray-400">All tasks completed, nice work!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length > 0 ? (
                completedTasks.map(renderTaskCard)
              ) : (
                <div className="text-center py-12">
                  <div className="material-icons mb-2 text-gray-400 text-4xl">hourglass_empty</div>
                  <p className="text-gray-500 dark:text-gray-400">No completed tasks yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}