import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarEvent } from "@shared/schema";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { format, isSameDay, parseISO, isToday, addMonths, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Add custom CSS for the calendar to show dots under days with events
import "@/styles/calendar.css";

export default function CalendarPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Format the current month for API query
  const startOfCurrentMonth = startOfMonth(currentMonth);
  const endOfNextMonth = startOfMonth(addMonths(currentMonth, 2));
  
  // Fetch calendar events
  const { 
    data: eventsData, 
    isLoading: isLoadingEvents, 
    isError: isErrorEvents 
  } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ["/api/calendar", startOfCurrentMonth.toISOString(), endOfNextMonth.toISOString()],
    queryFn: () => fetch(`/api/calendar?start=${startOfCurrentMonth.toISOString()}&end=${endOfNextMonth.toISOString()}`).then((res) => res.json()),
  });
  
  // Extract events array from response
  const events = eventsData?.events || [];
  
  // Get events for the selected date
  const selectedDateEvents = events.filter(event => 
    selectedDate && isSameDay(new Date(event.start_time), selectedDate)
  );
  
  // Format event time to display
  const formatEventTime = (dateString: Date | string) => {
    return format(typeof dateString === 'string' ? parseISO(dateString) : dateString, 'h:mm a');
  };
  
  // Generate dates with events for the calendar
  const datesWithEvents = events.reduce((acc: Record<string, number>, event) => {
    const date = new Date(event.start_time);
    const dateKey = format(date, 'yyyy-MM-dd');
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});
  
  // We'll use a different approach by creating a component to indicate events
  // This removes the type error with the Day component since we're not directly using it
  const hasDayWithEvent = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return datesWithEvents[dateKey] > 0;
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              <span className="material-icons text-sm mr-1">today</span>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="hidden sm:flex"
            >
              <span className="material-icons text-sm mr-1">arrow_back</span>
              Back
            </Button>
          </div>
        </div>
        
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Skeleton className="h-[350px] w-full rounded-lg" />
            </div>
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ) : isErrorEvents ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">Failed to load calendar data.</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="pt-6">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md"
                    modifiersClassNames={{
                      today: "bg-primary/20 text-primary font-bold",
                      selected: "bg-primary text-primary-foreground"
                    }}
                    modifiers={{
                      hasEvent: Object.keys(datesWithEvents).map(dateStr => new Date(dateStr))
                    }}
                  />
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-3">
                  <p className="text-sm text-muted-foreground">
                    {events.length} events in calendar
                  </p>
                  <Button variant="ghost" size="sm">
                    <span className="material-icons text-sm mr-1">add</span>
                    Add Event
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'No date selected'}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateEvents.length > 0 
                      ? `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? 's' : ''} scheduled` 
                      : 'No events scheduled'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDateEvents.map((event) => (
                        <div 
                          key={event.id} 
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {event.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {formatEventTime(event.start_time)}
                                {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                              </p>
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
                                    <p>Edit Event</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                      <span className="material-icons text-lg">delete</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete Event</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <p className="mt-2 text-gray-600 dark:text-gray-300">
                            {event.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="material-icons mb-2 text-gray-400 text-4xl">event_busy</div>
                      <p className="text-gray-500 dark:text-gray-400">No events scheduled for this day</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <span className="material-icons text-sm mr-1">add</span>
                        Add Event
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}