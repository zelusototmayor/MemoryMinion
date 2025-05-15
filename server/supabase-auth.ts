import { createClient } from "@supabase/supabase-js";
import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { InsertUser, User } from "@shared/schema";

// Interface to augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Initialize Supabase client for server-side operations
// Use fallback values to prevent crashes if no environment variables are provided
const fallbackUrl = "https://ddiuhzibatkmbnoudfea.supabase.co";
const fallbackKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaXVoemliYXRrbWJub3VkZmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTA1MDcsImV4cCI6MjA2MjEyNjUwN30.HEa2UlZsYXHS47WrVKVtp1-Z3NvZcGYn6HQC_Xb6FYM";

// Get server-side environment variables with fallbacks
const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const envKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Use environment variables or fallbacks
let supabaseUrl = envUrl || fallbackUrl;
let supabaseKey = envKey || fallbackKey;

// Clean up URL if it has formatting issues
if (supabaseUrl.includes("VITE_") || supabaseUrl.includes("SUPABASE_")) {
  supabaseUrl = supabaseUrl.replace(/VITE_/g, "").replace(/SUPABASE_/g, "");
}

// Ensure URL has proper https:// prefix
if (!supabaseUrl.startsWith("https://")) {
  supabaseUrl = `https://${supabaseUrl}`;
}

// Fix double https:// if present
if (supabaseUrl.includes("https://https://")) {
  supabaseUrl = supabaseUrl.replace("https://https://", "https://");
}

console.log(
  "[Server] Initializing Supabase with URL:",
  envUrl ? "Found" : "Using fallback",
);
console.log("[Server] Supabase key:", envKey ? "Found" : "Using fallback");

// Initialize client
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error("[Server] Failed to initialize Supabase client:", error);
  // If creation fails, set to null and we'll handle the null case in the middleware
  supabase = null;
}

// Default user to fall back to
const defaultUser: User = {
  id: 1,
  email: "default@example.com",
  password: "", // Empty password for Supabase auth
  displayName: "Default User",
  role: "user",
  created_at: new Date(),
};

// Middleware to verify JWT tokens from Supabase
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Allow unauthenticated access for now with default user
      req.user = defaultUser;
      return next();
    }

    // Extract JWT token
    const token = authHeader.split(" ")[1];

    // Check if Supabase client is available
    if (!supabase) {
      console.warn("Supabase client not available, using default user");
      req.user = defaultUser;
      return next();
    }

    // Verify token with Supabase (we already checked supabase is not null above)
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;

    if (error || !user) {
      console.error("Token verification failed:", error);
      // Fall back to default user for now
      req.user = defaultUser;
      return next();
    }

    // Get the user from our database or create if doesn't exist
    let dbUser = await storage.getUserByEmail(user.email || "");

    if (!dbUser && user.email) {
      // Create user in our database
      const newUser: InsertUser = {
        email: user.email,
        displayName: user.user_metadata.display_name || user.email,
        password: "", // No password needed with Supabase auth
        role: "user",
      };

      dbUser = await storage.createUser(newUser);
    }

    if (dbUser) {
      // Attach user to request
      req.user = dbUser;
    } else {
      // Fallback to default user
      req.user = defaultUser;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Fallback to default user
    req.user = defaultUser;
    next();
  }
};

// Setup Supabase auth middleware
export function setupSupabaseAuth(app: Express) {
  // Add token verification middleware to protected routes
  app.use("/api/*", verifyToken);
}
