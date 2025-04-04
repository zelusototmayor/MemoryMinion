import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMockAuth } from "@/hooks/use-mock-auth";

export default function Header() {
  const { user, logout } = useMockAuth();
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-primary">RevocAI</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleSearchBar}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <span className="material-icons">search</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                    {getInitials(user.displayName)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  Logout
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
                placeholder="Search conversations or contacts..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex mt-2 pb-1 space-x-2 overflow-x-auto scrollbar-hide">
              <button className="px-3 py-1 bg-primary text-white text-sm rounded-full">All</button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600">
                Conversations
              </button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600">
                Contacts
              </button>
              <button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full border border-gray-300 dark:border-gray-600">
                This Week
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
