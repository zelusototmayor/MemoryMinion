import { pgTable, text, serial, uuid, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
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
