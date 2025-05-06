import { createClient } from '@supabase/supabase-js';
import { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { InsertUser } from '@shared/schema';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Middleware to verify JWT tokens from Supabase
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // Allow unauthenticated access for now with default user
      req.user = {
        id: 1, // Default user ID for compatibility
        email: 'default@example.com',
        displayName: 'Default User',
        role: 'user',
      };
      return next();
    }

    // Extract JWT token
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Token verification failed:', error);
      // Fall back to default user for now
      req.user = {
        id: 1,
        email: 'default@example.com',
        displayName: 'Default User',
        role: 'user',
      };
      return next();
    }
    
    // Get the user from our database or create if doesn't exist
    let dbUser = await storage.getUserByEmail(user.email || '');
    
    if (!dbUser && user.email) {
      // Create user in our database
      const newUser: InsertUser = {
        email: user.email,
        display_name: user.user_metadata.display_name || user.email,
        password: '', // No password needed with Supabase auth
        role: 'user',
      };
      
      dbUser = await storage.createUser(newUser);
    }
    
    if (dbUser) {
      // Attach user to request
      req.user = dbUser;
    } else {
      // Fallback to default user
      req.user = {
        id: 1,
        email: 'default@example.com',
        displayName: 'Default User',
        role: 'user',
      };
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Fallback to default user
    req.user = {
      id: 1,
      email: 'default@example.com',
      displayName: 'Default User',
      role: 'user',
    };
    next();
  }
};

// Setup Supabase auth middleware
export function setupSupabaseAuth(app: Express) {
  // Add token verification middleware to protected routes
  app.use('/api/*', verifyToken);
}