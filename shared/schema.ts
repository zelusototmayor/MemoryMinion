import { pgTable, text, serial, uuid, timestamp, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").default("user").notNull(), // "user", "admin", "beta-tester"
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  user_id: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  created_at: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user_id: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  created_at: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: serial("conversation_id").references(() => conversations.id),
  sender: text("sender").notNull(), // "user" or "assistant"
  content: text("content").notNull(), 
  created_at: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  created_at: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Contact Links table (links messages to contacts when mentioned)
export const contactLinks = pgTable("contact_links", {
  id: serial("id").primaryKey(),
  contact_id: serial("contact_id").references(() => contacts.id),
  message_id: serial("message_id").references(() => messages.id),
  relationship: text("relationship").notNull().default("mentioned"), // e.g., "mentioned", "discussed", etc.
  created_at: timestamp("created_at").defaultNow(),
});

export const insertContactLinkSchema = createInsertSchema(contactLinks).omit({
  id: true,
  created_at: true,
});

export type InsertContactLink = z.infer<typeof insertContactLinkSchema>;
export type ContactLink = typeof contactLinks.$inferSelect;

// Additional types for API responses
export type UserWithoutPassword = Omit<User, "password">;

export type ConversationWithLastMessage = Conversation & {
  lastMessage?: Message;
  contactCount?: number;
};

export type ContactWithMentionCount = Contact & {
  mentionCount: number;
};

// Enhanced ContactLink type with contact name for UI display
export type ContactLinkWithName = ContactLink & {
  contact_name: string;
};

export type MessageWithContactLinks = Message & {
  contactLinks?: ContactLinkWithName[];
};

export type PotentialContact = {
  name: string;
  contextInfo?: string;
};

// Calendar Events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time"),
  all_day: boolean("all_day").default(false),
  message_id: integer("message_id").references(() => messages.id),
  conversation_id: integer("conversation_id").references(() => conversations.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  created_at: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  due_date: timestamp("due_date"),
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  message_id: integer("message_id").references(() => messages.id),
  conversation_id: integer("conversation_id").references(() => conversations.id),
  assigned_to: text("assigned_to"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
  completed_at: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
