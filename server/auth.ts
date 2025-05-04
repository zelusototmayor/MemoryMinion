import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";

// Define the User type for passport
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      password: string;
      displayName: string;
      role: string;
      created_at: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    console.error("Invalid stored password format - missing salt separator");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  if (!hashed || !salt) {
    console.error("Invalid stored password format - missing hash or salt");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "revocai-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: "email",
      passwordField: "password"
    }, async (email, password, done) => {
      try {
        console.log(`Attempting to authenticate user: ${email}`);
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          console.log(`Authentication failed: User with email ${email} not found`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log(`User found, verifying password for: ${email}`);
        if (!user.password) {
          console.error(`User ${email} has no password stored`);
          return done(null, false, { message: "Invalid user account" });
        }
        
        const passwordMatches = await comparePasswords(password, user.password);
        if (!passwordMatches) {
          console.log(`Authentication failed: Incorrect password for ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log(`Authentication successful for user: ${email}`);
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      console.log("Registration request received", { ...req.body, password: "[REDACTED]" });
      
      const { email, password, displayName, role } = req.body;
      
      // Validate required fields
      if (!email || !password || !displayName) {
        console.log("Registration failed: Missing required fields");
        return res.status(400).json({ message: "Email, password, and display name are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log(`Registration failed: Email already exists: ${email}`);
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      console.log("Hashing password for new user");
      const hashedPassword = await hashPassword(password);
      
      // Create user with default role "user"
      console.log(`Creating new user: ${email}`);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        displayName,
        role: role || "user"
      });
      
      console.log(`User created successfully: ${user.email}, ID: ${user.id}`);
      
      // Log in the user
      req.login(user, (loginErr: Error) => {
        if (loginErr) {
          console.error("Error logging in new user:", loginErr);
          return next(loginErr);
        }
        
        console.log(`User ${email} logged in successfully after registration`);
        
        // Return user info without password
        const { password: _, ...userWithoutPassword } = user;
        return res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login request received", { email: req.body.email, password: "[REDACTED]" });
    
    // Validate required fields
    if (!req.body.email || !req.body.password) {
      console.log("Login failed: Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    passport.authenticate("local", (err: Error | null, user: any, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log(`Login failed for ${req.body.email}: ${info?.message || "Invalid credentials"}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (loginErr: Error) => {
        if (loginErr) {
          console.error(`Error during login session creation for ${user.email}:`, loginErr);
          return next(loginErr);
        }
        
        console.log(`Login successful for user: ${user.email}, ID: ${user.id}`);
        
        // Return user info without password
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      console.log("Logout requested but no user is authenticated");
      return res.json({ message: "No user to log out" });
    }
    
    const userEmail = (req.user as Express.User).email;
    console.log(`Logout requested for user: ${userEmail}`);
    
    req.logout((err: Error) => {
      if (err) {
        console.error(`Error during logout for ${userEmail}:`, err);
        return next(err);
      }
      
      console.log(`User ${userEmail} logged out successfully`);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    console.log("Auth status check request received");
    
    if (!req.isAuthenticated()) {
      console.log("Auth check result: User not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as Express.User;
    console.log(`Auth check result: User authenticated - ${user.email}, ID: ${user.id}`);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });
}