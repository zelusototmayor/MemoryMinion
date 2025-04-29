import { 
  users, type User, type InsertUser,
  contacts, type Contact, type InsertContact,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  contactLinks, type ContactLink, type InsertContactLink,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent,
  tasks, type Task, type InsertTask,
  type UserWithoutPassword,
  type ConversationWithLastMessage,
  type ContactWithMentionCount,
  type MessageWithContactLinks,
  type ContactLinkWithName
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql, like, ilike, asc, gte, lte, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contact operations
  getContactsForUser(userId: number): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  getContactsByName(userId: number, name: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  
  // Conversation operations
  getConversationsForUser(userId: number): Promise<ConversationWithLastMessage[]>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Message operations
  getMessagesForConversation(conversationId: number): Promise<MessageWithContactLinks[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Contact links operations
  createContactLink(contactLink: InsertContactLink): Promise<ContactLink>;
  getContactLinksForMessage(messageId: number): Promise<ContactLink[]>;
  getContactLinksForContact(contactId: number): Promise<ContactLink[]>;
  
  // Calendar operations
  getCalendarEventsForUser(userId: number): Promise<CalendarEvent[]>;
  getCalendarEventById(id: number): Promise<CalendarEvent | undefined>;
  getCalendarEventsByTimeRange(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Task operations
  getTasksForUser(userId: number): Promise<Task[]>;
  getPendingTasksForUser(userId: number): Promise<Task[]>;
  getCompletedTasksForUser(userId: number): Promise<Task[]>;
  getTasksByDueDate(userId: number, startDate: Date, endDate: Date): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  completeTask(id: number): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Combined operations
  getFrequentContactsForUser(userId: number, limit?: number): Promise<ContactWithMentionCount[]>;
  searchConversations(userId: number, query: string): Promise<ConversationWithLastMessage[]>;
  searchContacts(userId: number, query: string): Promise<Contact[]>;
  getContactsWithMentionCount(userId: number): Promise<ContactWithMentionCount[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize session store for PostgreSQL
    // Create a partially compatible pool for the session store
    const sessionPool = {
      query: pool.query.bind(pool),
      on: () => {}, // Create empty on method for compatibility
      config: { 
        user: process.env.PGUSER,
        database: process.env.PGDATABASE
      },
    };
    
    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool as any,
      createTableIfMissing: true, 
      tableName: 'session'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Contact operations
  async getContactsForUser(userId: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.user_id, userId));
  }
  
  async getContactById(id: number): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getContactsByName(userId: number, name: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(
      and(
        eq(contacts.user_id, userId),
        ilike(contacts.name, `%${name}%`)
      )
    );
  }
  
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(insertContact).returning();
    return result[0];
  }
  
  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const result = await db.update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  // Conversation operations
  async getConversationsForUser(userId: number): Promise<ConversationWithLastMessage[]> {
    // Get all user conversations
    const userConversations = await db.select().from(conversations)
      .where(eq(conversations.user_id, userId));
    
    // Find the last message and contact count for each conversation
    const result: ConversationWithLastMessage[] = [];
    
    for (const conversation of userConversations) {
      // Get the last message for this conversation
      const lastMessageQuery = await db.select()
        .from(messages)
        .where(eq(messages.conversation_id, conversation.id))
        .orderBy(desc(messages.created_at))
        .limit(1);
      
      const lastMessage = lastMessageQuery.length > 0 ? lastMessageQuery[0] : undefined;
      
      // Count unique contacts mentioned in this conversation
      const contactCountQuery = await db.select({
        count: sql<number>`count(distinct ${contactLinks.contact_id})`
      })
      .from(contactLinks)
      .innerJoin(messages, eq(contactLinks.message_id, messages.id))
      .where(eq(messages.conversation_id, conversation.id));
      
      const contactCount = contactCountQuery[0]?.count || 0;
      
      result.push({
        ...conversation,
        lastMessage,
        contactCount
      });
    }
    
    // Sort by last message date or creation date
    return result.sort((a, b) => {
      // Sort by creation date if no messages
      if (!a.lastMessage && !b.lastMessage) {
        return (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0);
      }
      
      // Sort by last message date
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      
      return (b.lastMessage.created_at?.getTime() || 0) - (a.lastMessage.created_at?.getTime() || 0);
    });
  }
  
  async getConversationById(id: number): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(insertConversation).returning();
    return result[0];
  }
  
  async updateConversation(id: number, conversationUpdate: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await db.update(conversations)
      .set(conversationUpdate)
      .where(eq(conversations.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  // Message operations
  async getMessagesForConversation(conversationId: number): Promise<MessageWithContactLinks[]> {
    // Get messages for this conversation
    const conversationMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(asc(messages.created_at));
    
    // Get contact links for each message
    const result: MessageWithContactLinks[] = [];
    
    for (const message of conversationMessages) {
      // Get contact links with contact names for this message
      const links = await db
        .select({
          id: contactLinks.id,
          contact_id: contactLinks.contact_id,
          message_id: contactLinks.message_id,
          relationship: contactLinks.relationship,
          created_at: contactLinks.created_at,
          contact_name: contacts.name
        })
        .from(contactLinks)
        .innerJoin(contacts, eq(contactLinks.contact_id, contacts.id))
        .where(eq(contactLinks.message_id, message.id));
      
      result.push({
        ...message,
        contactLinks: links as unknown as ContactLinkWithName[]
      });
    }
    
    return result;
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }
  
  // Contact links operations
  async createContactLink(insertContactLink: InsertContactLink): Promise<ContactLink> {
    const result = await db.insert(contactLinks).values(insertContactLink).returning();
    return result[0];
  }
  
  async getContactLinksForMessage(messageId: number): Promise<ContactLink[]> {
    return await db.select()
      .from(contactLinks)
      .where(eq(contactLinks.message_id, messageId));
  }
  
  async getContactLinksForContact(contactId: number): Promise<ContactLink[]> {
    return await db.select()
      .from(contactLinks)
      .where(eq(contactLinks.contact_id, contactId));
  }
  
  // Combined operations
  async getFrequentContactsForUser(userId: number, limit: number = 4): Promise<ContactWithMentionCount[]> {
    // Get contacts with mention counts
    const contactCounts = await db.select({
      contact_id: contactLinks.contact_id,
      mentionCount: sql<number>`count(${contactLinks.id})`
    })
    .from(contactLinks)
    .innerJoin(contacts, eq(contactLinks.contact_id, contacts.id))
    .where(eq(contacts.user_id, userId))
    .groupBy(contactLinks.contact_id)
    .orderBy(desc(sql<number>`count(${contactLinks.id})`))
    .limit(limit);
    
    // Get the full contact details and add mention counts
    const result: ContactWithMentionCount[] = [];
    
    for (const { contact_id, mentionCount } of contactCounts) {
      const contactDetails = await this.getContactById(contact_id);
      if (contactDetails) {
        result.push({
          ...contactDetails,
          mentionCount: Number(mentionCount)
        });
      }
    }
    
    return result;
  }
  
  async searchConversations(userId: number, query: string): Promise<ConversationWithLastMessage[]> {
    // Search in conversation titles
    const conversationsByTitle = await db.select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user_id, userId),
          ilike(conversations.title, `%${query}%`)
        )
      );
    
    // Search in messages content
    const conversationsByMessage = await db.select({
      conversation_id: messages.conversation_id
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversation_id, conversations.id))
    .where(
      and(
        eq(conversations.user_id, userId),
        ilike(messages.content, `%${query}%`)
      )
    )
    .groupBy(messages.conversation_id);
    
    // Combine conversation IDs (remove duplicates)
    const titleIds = conversationsByTitle.map(c => c.id);
    const messageIds = conversationsByMessage.map(c => c.conversation_id);
    const uniqueIds = Array.from(new Set([...titleIds, ...messageIds]));
    
    // Get full conversation data with last message
    const result: ConversationWithLastMessage[] = [];
    
    for (const id of uniqueIds) {
      const conversation = await this.getConversationById(id);
      if (conversation) {
        // Get last message
        const lastMessageQuery = await db.select()
          .from(messages)
          .where(eq(messages.conversation_id, id))
          .orderBy(desc(messages.created_at))
          .limit(1);
        
        const lastMessage = lastMessageQuery.length > 0 ? lastMessageQuery[0] : undefined;
        
        result.push({
          ...conversation,
          lastMessage
        });
      }
    }
    
    return result;
  }
  
  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    // Search in contact name or notes
    return await db.select()
      .from(contacts)
      .where(
        and(
          eq(contacts.user_id, userId),
          sql`(${contacts.name} ILIKE ${'%' + query + '%'} OR ${contacts.notes} ILIKE ${'%' + query + '%'})`
        )
      );
  }
  
  async getContactsWithMentionCount(userId: number): Promise<ContactWithMentionCount[]> {
    // Get all contacts for this user
    const userContacts = await this.getContactsForUser(userId);
    
    // Get mention counts for each contact
    const result: ContactWithMentionCount[] = [];
    
    for (const contact of userContacts) {
      const links = await this.getContactLinksForContact(contact.id);
      result.push({
        ...contact,
        mentionCount: links.length
      });
    }
    
    // Sort by mention count
    return result.sort((a, b) => b.mentionCount - a.mentionCount);
  }

  // Calendar operations
  async getCalendarEventsForUser(userId: number): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents)
      .where(eq(calendarEvents.user_id, userId))
      .orderBy(asc(calendarEvents.start_time));
  }

  async getCalendarEventById(id: number): Promise<CalendarEvent | undefined> {
    const result = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getCalendarEventsByTimeRange(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.user_id, userId),
          gte(calendarEvents.start_time, startDate),
          lte(calendarEvents.start_time, endDate)
        )
      )
      .orderBy(asc(calendarEvents.start_time));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const result = await db.insert(calendarEvents).values(event).returning();
    return result[0];
  }

  async updateCalendarEvent(id: number, eventUpdate: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const result = await db.update(calendarEvents)
      .set(eventUpdate)
      .where(eq(calendarEvents.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    const result = await db.delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning();
    return result.length > 0;
  }

  // Task operations
  async getTasksForUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.user_id, userId))
      .orderBy(asc(tasks.due_date));
  }

  async getPendingTasksForUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(
        and(
          eq(tasks.user_id, userId),
          eq(tasks.completed, false)
        )
      )
      .orderBy(asc(tasks.due_date));
  }

  async getCompletedTasksForUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(
        and(
          eq(tasks.user_id, userId),
          eq(tasks.completed, true)
        )
      )
      .orderBy(desc(tasks.completed_at));
  }

  async getTasksByDueDate(userId: number, startDate: Date, endDate: Date): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(
        and(
          eq(tasks.user_id, userId),
          gte(tasks.due_date, startDate),
          lte(tasks.due_date, endDate)
        )
      )
      .orderBy(asc(tasks.due_date));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const now = new Date();
    const result = await db.update(tasks)
      .set({ 
        completed: true,
        completed_at: now
      })
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
