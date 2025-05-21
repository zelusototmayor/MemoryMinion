import { useEffect } from 'react';
import { Route, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const isLoggedIn = !!user;

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setLocation('/auth');
    }
  }, [isLoggedIn, isLoading, setLocation]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isLoggedIn ? (
        <Component />
      ) : null}
    </Route>
  );
}