import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { 
  insertContactSchema, 
  insertConversationSchema, 
  insertMessageSchema, 
  insertContactLinkSchema,
  insertCalendarEventSchema,
  insertTaskSchema,
  type ContactWithMentionCount,
  type CalendarEvent,
  type Task
} from "@shared/schema";
import { storage } from "./storage";
import { transcribeAudio, processMessage, detectContacts, detectCalendarEvents, detectTasks, generateConversationTitle } from "./openai";
import multer from "multer";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Set up multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
}

// For beta testing, we'll allow all authenticated users to access admin features
// In a production app, you'd want more sophisticated role management
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up authentication
  setupAuth(app);
  
  // Admin routes for user management
  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.post("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password - use the same function from auth.ts
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        displayName
      });
      
      // Return user info without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Conversation routes - require authentication
  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get conversations
      const conversations = await storage.getConversationsForUser(userId);
      
      // For each conversation, get contact count
      for (const conversation of conversations) {
        // Get messages for this conversation
        const messages = await storage.getMessagesForConversation(conversation.id);
        
        // Extract unique contact IDs mentioned in this conversation
        const contactIds = new Set<number>();
        messages.forEach(message => {
          if (message.contactLinks && message.contactLinks.length > 0) {
            message.contactLinks.forEach(link => {
              contactIds.add(link.contact_id);
            });
          }
        });
        
        // Add contact count to conversation
        conversation.contactCount = contactIds.size;
      }
      
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
        
        // Detect and process contacts, calendar events, and tasks in user message
        const [{ potentialContacts }, { events }, { tasks }] = await Promise.all([
          detectContacts(content),
          detectCalendarEvents(content),
          detectTasks(content)
        ]);
        
        // Return detected entities for frontend to handle
        return res.status(201).json({ 
          message, 
          aiResponse, 
          potentialContacts,
          events,
          tasks
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

  // Get contacts mentioned in a conversation
  app.get("/api/conversations/:id/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Verify the conversation exists and belongs to user
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (conversation.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all messages for this conversation
      const messages = await storage.getMessagesForConversation(conversationId);
      
      // Extract unique contact IDs mentioned in this conversation
      const contactIds = new Set<number>();
      messages.forEach(message => {
        if (message.contactLinks && message.contactLinks.length > 0) {
          message.contactLinks.forEach(link => {
            contactIds.add(link.contact_id);
          });
        }
      });
      
      // Get the contact details for these IDs
      const contactsWithMentions: ContactWithMentionCount[] = [];
      
      // Convert Set to Array and process in sequence
      const contactIdsArray = Array.from(contactIds);
      for (let i = 0; i < contactIdsArray.length; i++) {
        const contactId = contactIdsArray[i];
        const contact = await storage.getContactById(contactId);
        
        if (contact) {
          // Count mentions of this contact in the conversation
          let mentionCount = 0;
          messages.forEach(message => {
            if (message.contactLinks) {
              message.contactLinks.forEach(link => {
                if (link.contact_id === contactId) {
                  mentionCount++;
                }
              });
            }
          });
          
          // Add to result with mention count
          contactsWithMentions.push({
            ...contact,
            mentionCount
          });
        }
      }
      
      // Sort by mention count (most mentioned first)
      contactsWithMentions.sort((a, b) => b.mentionCount - a.mentionCount);
      
      return res.json({ contacts: contactsWithMentions });
    } catch (error) {
      console.error("Error fetching conversation contacts:", error);
      return res.status(500).json({ message: "Failed to fetch conversation contacts" });
    }
  });

  // Calendar Event Routes
  app.get("/api/calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Check for date range parameters
      if (req.query.start && req.query.end) {
        const startDate = new Date(req.query.start as string);
        const endDate = new Date(req.query.end as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Invalid date range parameters" });
        }
        
        const events = await storage.getCalendarEventsByTimeRange(userId, startDate, endDate);
        return res.json({ events });
      }
      
      // No date range, return all events
      const events = await storage.getCalendarEventsForUser(userId);
      return res.json({ events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  
  app.get("/api/calendar/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify the event belongs to the user
      const userId = (req.user as Express.User).id;
      if (event.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.json({ event });
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      return res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });
  
  app.post("/api/calendar", isAuthenticated, zValidator("body", insertCalendarEventSchema), async (req: Request, res: Response) => {
    try {
      // Ensure user_id matches the authenticated user
      const userId = (req.user as Express.User).id;
      const event = await storage.createCalendarEvent({
        ...req.body,
        user_id: userId
      });
      return res.status(201).json({ event });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return res.status(500).json({ message: "Failed to create calendar event" });
    }
  });
  
  app.put("/api/calendar/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      // Check if the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (existingEvent.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the event
      const updatedEvent = await storage.updateCalendarEvent(id, req.body);
      return res.json({ event: updatedEvent });
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return res.status(500).json({ message: "Failed to update calendar event" });
    }
  });
  
  app.delete("/api/calendar/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      // Check if the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (existingEvent.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the event
      const success = await storage.deleteCalendarEvent(id);
      if (success) {
        return res.status(200).json({ message: "Event deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete event" });
      }
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });
  
  // Task Routes
  app.get("/api/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Handle different filter options
      const filter = req.query.filter as string;
      
      if (filter === "pending") {
        const tasks = await storage.getPendingTasksForUser(userId);
        return res.json({ tasks });
      } else if (filter === "completed") {
        const tasks = await storage.getCompletedTasksForUser(userId);
        return res.json({ tasks });
      } else if (req.query.start && req.query.end) {
        // Filter by due date range
        const startDate = new Date(req.query.start as string);
        const endDate = new Date(req.query.end as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Invalid date range parameters" });
        }
        
        const tasks = await storage.getTasksByDueDate(userId, startDate, endDate);
        return res.json({ tasks });
      }
      
      // No filters, return all tasks
      const tasks = await storage.getTasksForUser(userId);
      return res.json({ tasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify the task belongs to the user
      const userId = (req.user as Express.User).id;
      if (task.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.json({ task });
    } catch (error) {
      console.error("Error fetching task:", error);
      return res.status(500).json({ message: "Failed to fetch task" });
    }
  });
  
  app.post("/api/tasks", isAuthenticated, zValidator("body", insertTaskSchema), async (req: Request, res: Response) => {
    try {
      // Ensure user_id matches the authenticated user
      const userId = (req.user as Express.User).id;
      const task = await storage.createTask({
        ...req.body,
        user_id: userId
      });
      return res.status(201).json({ task });
    } catch (error) {
      console.error("Error creating task:", error);
      return res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  app.put("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      // Check if the task exists and belongs to the user
      const existingTask = await storage.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (existingTask.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the task
      const updatedTask = await storage.updateTask(id, req.body);
      return res.json({ task: updatedTask });
    } catch (error) {
      console.error("Error updating task:", error);
      return res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  app.post("/api/tasks/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      // Check if the task exists and belongs to the user
      const existingTask = await storage.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (existingTask.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Mark the task as completed
      const completedTask = await storage.completeTask(id);
      return res.json({ task: completedTask });
    } catch (error) {
      console.error("Error completing task:", error);
      return res.status(500).json({ message: "Failed to complete task" });
    }
  });
  
  app.delete("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      // Check if the task exists and belongs to the user
      const existingTask = await storage.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const userId = (req.user as Express.User).id;
      if (existingTask.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the task
      const success = await storage.deleteTask(id);
      if (success) {
        return res.status(200).json({ message: "Task deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete task" });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      return res.status(500).json({ message: "Failed to delete task" });
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
