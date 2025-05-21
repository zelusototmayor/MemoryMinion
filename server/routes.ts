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
import { setupSupabaseAuth } from "./supabase-auth";

// Set up multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get user ID from request - requires authentication
function getUserId(req: Request): number {
  if (!req.user?.id) {
    throw new Error("Authentication required");
  }
  return req.user.id;
}

// Validator function for request bodies
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Supabase authentication middleware
  setupSupabaseAuth(app);
  
  const httpServer = createServer(app);
  
  // Admin routes for user management
  app.get("/api/admin/users", async (req: Request, res: Response) => {
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
  
  app.post("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const { email, displayName, role } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create user with placeholder password (no authentication)
      const user = await storage.createUser({
        email,
        password: "no-auth-placeholder",
        displayName,
        role: role || "user" // Default to "user" if role is not provided
      });
      
      // Return user info without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Conversation routes
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      
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
  
  app.post("/api/conversations", zValidator("body", insertConversationSchema), async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
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
      
      // No need to check user ID - we're using a default user
      const messages = await storage.getMessagesForConversation(id);
      
      return res.json({ conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  
  // Update a conversation
  app.put("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversationById(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Update the conversation
      const updatedConversation = await storage.updateConversation(id, req.body);
      
      return res.json({ conversation: updatedConversation });
    } catch (error) {
      console.error("Error updating conversation:", error);
      return res.status(500).json({ message: "Failed to update conversation" });
    }
  });
  
  // Message routes
  app.post("/api/messages", zValidator("body", insertMessageSchema), async (req: Request, res: Response) => {
    try {
      const { conversation_id, sender, content } = req.body;
      
      // Verify that the conversation exists
      const conversation = await storage.getConversationById(conversation_id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
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
  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
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
  app.get("/api/contacts", async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      const contacts = await storage.getContactsWithMentionCount(userId);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  app.post("/api/contacts", zValidator("body", insertContactSchema), async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
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
  app.get("/api/contacts/frequent", async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 4;
      
      const contacts = await storage.getFrequentContactsForUser(userId, limit);
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching frequent contacts:", error);
      return res.status(500).json({ message: "Failed to fetch frequent contacts" });
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
      
      // No need to check user ID - we're using a default user
      const contactLinks = await storage.getContactLinksForContact(id);
      
      // Get messages associated with this contact
      const messageIds = contactLinks.map(link => link.message_id);
      const messages = [];
      
      for (const messageId of messageIds) {
        // For each message ID, find messages in all conversations
        // This approach might need optimization in a production app
        const conversations = await storage.getConversationsForUser(DEFAULT_USER_ID);
        
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
  app.post("/api/contact-links", zValidator("body", insertContactLinkSchema), async (req: Request, res: Response) => {
    try {
      const contactLink = await storage.createContactLink(req.body);
      
      // Verify that the contact exists
      const contact = await storage.getContactById(req.body.contact_id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      return res.status(201).json({ contactLink });
    } catch (error) {
      console.error("Error creating contact link:", error);
      return res.status(500).json({ message: "Failed to create contact link" });
    }
  });
  
  // Search routes
  app.get("/api/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      
      // Search in conversations and contacts
      const [conversations, contacts] = await Promise.all([
        storage.searchConversations(userId, query),
        storage.searchContacts(userId, query)
      ]);
      
      return res.json({ conversations, contacts });
    } catch (error) {
      console.error("Error searching:", error);
      return res.status(500).json({ message: "Failed to search" });
    }
  });
  
  // Generate conversation title
  app.post("/api/generate-title", async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Valid messages array is required" });
      }
      
      const simplifiedMessages = messages.map(m => ({
        sender: m.sender,
        content: m.content
      }));
      
      const title = await generateConversationTitle(simplifiedMessages);
      
      return res.json({ title });
    } catch (error) {
      console.error("Error generating title:", error);
      return res.status(500).json({ message: "Failed to generate title" });
    }
  });
  
  // Get conversation contacts
  app.get("/api/conversations/:id/contacts", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Get conversation to verify it exists
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get messages for this conversation
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
      
      // Get contact details for each ID
      const contacts = [];
      // Convert Set to Array for iteration
      const contactIdArray = Array.from(contactIds);
      for (const contactId of contactIdArray) {
        const contact = await storage.getContactById(contactId);
        if (contact) {
          contacts.push(contact);
        }
      }
      
      return res.json({ contacts });
    } catch (error) {
      console.error("Error fetching conversation contacts:", error);
      return res.status(500).json({ message: "Failed to fetch conversation contacts" });
    }
  });
  
  // Calendar routes
  app.get("/api/calendar", async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      
      // Handle date range filter
      if (req.query.start && req.query.end) {
        const startDate = new Date(req.query.start as string);
        const endDate = new Date(req.query.end as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Invalid date range" });
        }
        
        const events = await storage.getCalendarEventsByTimeRange(userId, startDate, endDate);
        return res.json({ events });
      }
      
      // No filter, return all events
      const events = await storage.getCalendarEventsForUser(userId);
      return res.json({ events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  
  app.get("/api/calendar/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      return res.json({ event });
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      return res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });
  
  app.post("/api/calendar", zValidator("body", insertCalendarEventSchema), async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
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
  
  app.put("/api/calendar/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Update event
      const updatedEvent = await storage.updateCalendarEvent(id, req.body);
      
      return res.json({ event: updatedEvent });
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return res.status(500).json({ message: "Failed to update calendar event" });
    }
  });
  
  app.delete("/api/calendar/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Delete event
      const success = await storage.deleteCalendarEvent(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete calendar event" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });
  
  // Task routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
      
      // Handle status filter
      const status = req.query.status as string;
      if (status === "pending") {
        const tasks = await storage.getPendingTasksForUser(userId);
        return res.json({ tasks });
      } else if (status === "completed") {
        const tasks = await storage.getCompletedTasksForUser(userId);
        return res.json({ tasks });
      }
      
      // Handle date range filter
      if (req.query.start && req.query.end) {
        const startDate = new Date(req.query.start as string);
        const endDate = new Date(req.query.end as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Invalid date range" });
        }
        
        const tasks = await storage.getTasksByDueDate(userId, startDate, endDate);
        return res.json({ tasks });
      }
      
      // No filter, return all tasks
      const tasks = await storage.getTasksForUser(userId);
      return res.json({ tasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      return res.json({ task });
    } catch (error) {
      console.error("Error fetching task:", error);
      return res.status(500).json({ message: "Failed to fetch task" });
    }
  });
  
  app.post("/api/tasks", zValidator("body", insertTaskSchema), async (req: Request, res: Response) => {
    try {
      // Use default user ID
      const userId = DEFAULT_USER_ID;
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
  
  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Update task
      const updatedTask = await storage.updateTask(id, req.body);
      
      return res.json({ task: updatedTask });
    } catch (error) {
      console.error("Error updating task:", error);
      return res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  app.post("/api/tasks/:id/complete", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Complete task
      const completedTask = await storage.completeTask(id);
      
      return res.json({ task: completedTask });
    } catch (error) {
      console.error("Error completing task:", error);
      return res.status(500).json({ message: "Failed to complete task" });
    }
  });
  
  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Delete task
      const success = await storage.deleteTask(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete task" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      return res.status(500).json({ message: "Failed to delete task" });
    }
  });
  
  // Catch all API routes that don't exist
  app.all('/api/*', (req: Request, res: Response) => {
    return res.status(404).json({ message: "API endpoint not found" });
  });

  return httpServer;
}