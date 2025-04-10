import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { insertContactSchema, insertConversationSchema, insertMessageSchema, insertContactLinkSchema } from "@shared/schema";
import { storage } from "./storage";
import { transcribeAudio, processMessage, detectContacts, generateConversationTitle } from "./openai";
import multer from "multer";
import { setupAuth } from "./auth";

// Set up multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // For development, bypass authentication check and set a mock user
  if (!req.user) {
    req.user = {
      id: 1,
      email: "dev@example.com",
      displayName: "Dev User",
      created_at: new Date()
    } as Express.User;
  }
  return next();
  
  // This is the production code:
  // if (req.isAuthenticated()) {
  //   return next();
  // }
  // return res.status(401).json({ message: "Not authenticated" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up authentication
  setupAuth(app);
  
  // Conversation routes - require authentication
  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const conversations = await storage.getConversationsForUser(userId);
      return res.json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  app.post("/api/conversations", isAuthenticated, zValidator("body", insertConversationSchema), async (req: Request, res: Response) => {
    try {
      // Make sure user_id matches the authenticated user
      const userId = (req.user as Express.User).id;
      const conversation = await storage.createConversation({
        ...req.body,
        user_id: userId
      });
      return res.status(201).json({ conversation });
    } catch (error) {
      console.error("Error creating conversation:", error);
      return res.status(500).json({ message: "Failed to create conversation" });
    }
  });
  
  app.get("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversationById(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if conversation belongs to the authenticated user
      const userId = (req.user as Express.User).id;
      if (conversation.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessagesForConversation(id);
      
      return res.json({ conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  
  // Message routes
  app.post("/api/messages", isAuthenticated, zValidator("body", insertMessageSchema), async (req: Request, res: Response) => {
    try {
      const { conversation_id, sender, content } = req.body;
      
      // Verify that the conversation belongs to the authenticated user
      const conversation = await storage.getConversationById(conversation_id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (conversation.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create message
      const message = await storage.createMessage({ conversation_id, sender, content });
      
      let aiResponse = null;
      
      // If sender is user, process with AI and create response
      if (sender === "user") {
        // Get conversation history
        const messages = await storage.getMessagesForConversation(conversation_id);
        const history = messages.map(m => ({
          role: m.sender === "user" ? "user" as const : "assistant" as const,
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
  app.post("/api/transcribe", isAuthenticated, upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "No audio file provided" });
      }
      
      const text = await transcribeAudio(req.file.buffer);
      return res.json({ text });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      return res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });
  
  // Contact routes
  app.get("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const contacts = await storage.getContactsWithMentionCount(userId);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  app.post("/api/contacts", isAuthenticated, zValidator("body", insertContactSchema), async (req: Request, res: Response) => {
    try {
      // Make sure user_id matches the authenticated user
      const userId = (req.user as Express.User).id;
      const contact = await storage.createContact({
        ...req.body,
        user_id: userId
      });
      return res.status(201).json({ contact });
    } catch (error) {
      console.error("Error creating contact:", error);
      return res.status(500).json({ message: "Failed to create contact" });
    }
  });
  
  // Important: /frequent must come BEFORE /:id to avoid route conflicts
  app.get("/api/contacts/frequent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 4;
      
      const contacts = await storage.getFrequentContactsForUser(userId, limit);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching frequent contacts:", error);
      return res.status(500).json({ message: "Failed to fetch frequent contacts" });
    }
  });
  
  app.get("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const contact = await storage.getContactById(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Check if contact belongs to the authenticated user
      const userId = (req.user as Express.User).id;
      if (contact.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const contactLinks = await storage.getContactLinksForContact(id);
      
      // Get messages associated with this contact
      const messageIds = contactLinks.map(link => link.message_id);
      const messages = [];
      
      for (const messageId of messageIds) {
        // For each message ID, find messages in all conversations
        // This approach might need optimization in a production app
        const conversations = await storage.getConversationsForUser(userId);
        
        for (const conversation of conversations) {
          const conversationMessages = await storage.getMessagesForConversation(conversation.id);
          const matchingMessage = conversationMessages.find(msg => msg.id === messageId);
          
          if (matchingMessage) {
            messages.push(matchingMessage);
            break;
          }
        }
      }
      
      return res.json({ contact, messages });
    } catch (error) {
      console.error("Error fetching contact:", error);
      return res.status(500).json({ message: "Failed to fetch contact" });
    }
  });
  
  // Contact link routes
  app.post("/api/contact-links", isAuthenticated, zValidator("body", insertContactLinkSchema), async (req: Request, res: Response) => {
    try {
      const contactLink = await storage.createContactLink(req.body);
      
      // Verify that both the contact and message belong to the user
      const contact = await storage.getContactById(req.body.contact_id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (contact.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(201).json({ contactLink });
    } catch (error) {
      console.error("Error creating contact link:", error);
      return res.status(500).json({ message: "Failed to create contact link" });
    }
  });
  
  // Search routes
  app.get("/api/search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      const query = req.query.q as string;
      
      if (!query) {
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
  app.post("/api/generate-title", isAuthenticated, async (req: Request, res: Response) => {
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

  // Create a catch-all API route handler for unmatched API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ message: `API endpoint not found: ${req.path}` });
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
