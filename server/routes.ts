import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { insertUserSchema, insertContactSchema, insertConversationSchema, insertMessageSchema, insertContactLinkSchema } from "@shared/schema";
import { storage } from "./storage";
import { transcribeAudio, processMessage, detectContacts, generateConversationTitle } from "./openai";
import multer from "multer";
import { zValidator } from "./middleware";

// Set up multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Authentication routes
  app.post("/api/auth/register", zValidator("body", insertUserSchema), async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create new user
      const user = await storage.createUser({ email, password, displayName });
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check password (in a real app, use bcrypt or similar)
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error logging in:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Conversation routes
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const conversations = await storage.getConversationsForUser(userId);
      return res.json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  app.post("/api/conversations", zValidator("body", insertConversationSchema), async (req: Request, res: Response) => {
    try {
      const conversation = await storage.createConversation(req.body);
      return res.status(201).json({ conversation });
    } catch (error) {
      console.error("Error creating conversation:", error);
      return res.status(500).json({ message: "Failed to create conversation" });
    }
  });
  
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversationById(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getMessagesForConversation(id);
      
      return res.json({ conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  
  // Message routes
  app.post("/api/messages", zValidator("body", insertMessageSchema), async (req: Request, res: Response) => {
    try {
      const { conversation_id, sender, content } = req.body;
      
      // Create message
      const message = await storage.createMessage({ conversation_id, sender, content });
      
      let aiResponse = null;
      
      // If sender is user, process with AI and create response
      if (sender === "user") {
        // Get conversation history
        const messages = await storage.getMessagesForConversation(conversation_id);
        const history = messages.map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.content
        }));
        
        // Process with AI
        const aiContent = await processMessage(content, history);
        
        // Create AI response message
        aiResponse = await storage.createMessage({
          conversation_id,
          sender: "assistant",
          content: aiContent
        });
        
        // Detect and process contacts in user message
        const { potentialContacts } = await detectContacts(content);
        
        // Return detected contacts for frontend to handle
        return res.status(201).json({ 
          message, 
          aiResponse, 
          potentialContacts 
        });
      }
      
      return res.status(201).json({ message });
    } catch (error) {
      console.error("Error creating message:", error);
      return res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // Audio transcription route
  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "No audio file provided" });
      }
      
      const transcription = await transcribeAudio(req.file.buffer);
      return res.json({ transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      return res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });
  
  // Contact routes
  app.get("/api/contacts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const contacts = await storage.getContactsWithMentionCount(userId);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  app.post("/api/contacts", zValidator("body", insertContactSchema), async (req: Request, res: Response) => {
    try {
      const contact = await storage.createContact(req.body);
      return res.status(201).json({ contact });
    } catch (error) {
      console.error("Error creating contact:", error);
      return res.status(500).json({ message: "Failed to create contact" });
    }
  });
  
  app.get("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const contact = await storage.getContactById(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const contactLinks = await storage.getContactLinksForContact(id);
      
      // Get messages associated with this contact
      const messageIds = contactLinks.map(link => link.message_id);
      const messages = [];
      
      for (const messageId of messageIds) {
        const message = Array.from((await storage.getMessagesForConversation(0)).filter(
          message => message.id === messageId
        ));
        
        if (message.length > 0) {
          messages.push(message[0]);
        }
      }
      
      return res.json({ contact, messages });
    } catch (error) {
      console.error("Error fetching contact:", error);
      return res.status(500).json({ message: "Failed to fetch contact" });
    }
  });
  
  app.get("/api/contacts/frequent", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 4;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const contacts = await storage.getFrequentContactsForUser(userId, limit);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching frequent contacts:", error);
      return res.status(500).json({ message: "Failed to fetch frequent contacts" });
    }
  });
  
  // Contact link routes
  app.post("/api/contact-links", zValidator("body", insertContactLinkSchema), async (req: Request, res: Response) => {
    try {
      const contactLink = await storage.createContactLink(req.body);
      return res.status(201).json({ contactLink });
    } catch (error) {
      console.error("Error creating contact link:", error);
      return res.status(500).json({ message: "Failed to create contact link" });
    }
  });
  
  // Search routes
  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string, 10);
      const query = req.query.q as string;
      
      if (isNaN(userId) || !query) {
        return res.status(400).json({ message: "Invalid search parameters" });
      }
      
      const conversations = await storage.searchConversations(userId, query);
      const contacts = await storage.searchContacts(userId, query);
      
      return res.json({ conversations, contacts });
    } catch (error) {
      console.error("Error searching:", error);
      return res.status(500).json({ message: "Search failed" });
    }
  });
  
  // Generate conversation title
  app.post("/api/generate-title", async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Invalid messages array" });
      }
      
      const title = await generateConversationTitle(messages);
      return res.json({ title });
    } catch (error) {
      console.error("Error generating title:", error);
      return res.status(500).json({ message: "Failed to generate title" });
    }
  });

  return httpServer;
}

// Middleware for Zod validation
function zValidator(type: "body" | "query" | "params", schema: z.ZodType<any, any>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      const result = schema.parse(req[type]);
      req[type] = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      next(error);
    }
  };
}
