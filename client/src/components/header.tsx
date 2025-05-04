import { useState } from "react";
import { Link, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthQuery } from "@/hooks/use-auth-query";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Get auth context values
  const { user, logout, isLoggedIn } = useAuthQuery();
  
  // Handle logout with proper error handling
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    console.log("Attempting to logout...");
    setIsLoggingOut(true);
    try {
      await logout();
      // Redirect happens in the logout function
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred while logging out",
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
  };
  
  const getInitials = (name: string = "") => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10 sticky top-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-primary">RevocAI</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleSearchBar}
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label="Search"
            >
              <span className="material-icons">search</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center" aria-label="User menu">
                  <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-medium">
                    {getInitials(user?.displayName)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <span className="material-icons mr-2 text-sm">person</span>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="material-icons mr-2 text-sm">settings</span>
                  Settings
                </DropdownMenuItem>
                
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <Link href="/admin/users">
                      <DropdownMenuItem>
                        <span className="material-icons mr-2 text-sm">admin_panel_settings</span>
                        User Management
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <span className="material-icons mr-2 text-sm">logout</span>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearchBar && (
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                search
              </span>
              <input 
                type="text" 
                placeholder="Search conversations..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex mt-2 pb-1 space-x-2 overflow-x-auto hide-scrollbar">
              <button className="px-3 py-1 bg-primary text-white text-sm rounded-full whitespace-nowrap">All</button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                Conversations
              </button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                Contacts
              </button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600 whitespace-nowrap">
                This Week
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
