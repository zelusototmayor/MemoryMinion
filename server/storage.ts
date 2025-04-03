import { 
  users, type User, type InsertUser,
  contacts, type Contact, type InsertContact,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  contactLinks, type ContactLink, type InsertContactLink,
  type UserWithoutPassword,
  type ConversationWithLastMessage,
  type ContactWithMentionCount,
  type MessageWithContactLinks
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  
  // Combined operations
  getFrequentContactsForUser(userId: number, limit?: number): Promise<ContactWithMentionCount[]>;
  searchConversations(userId: number, query: string): Promise<ConversationWithLastMessage[]>;
  searchContacts(userId: number, query: string): Promise<Contact[]>;
  getContactsWithMentionCount(userId: number): Promise<ContactWithMentionCount[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private contactLinks: Map<number, ContactLink>;
  
  private currentUserIds: number;
  private currentContactIds: number;
  private currentConversationIds: number;
  private currentMessageIds: number;
  private currentContactLinkIds: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.contactLinks = new Map();
    
    this.currentUserIds = 1;
    this.currentContactIds = 1;
    this.currentConversationIds = 1;
    this.currentMessageIds = 1;
    this.currentContactLinkIds = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserIds++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      created_at: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  // Contact operations
  async getContactsForUser(userId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.user_id === userId,
    );
  }
  
  async getContactById(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }
  
  async getContactsByName(userId: number, name: string): Promise<Contact[]> {
    const normalizedName = name.toLowerCase();
    return Array.from(this.contacts.values()).filter(
      (contact) => 
        contact.user_id === userId && 
        contact.name.toLowerCase().includes(normalizedName),
    );
  }
  
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactIds++;
    const now = new Date();
    const contact: Contact = { 
      ...insertContact, 
      id, 
      created_at: now 
    };
    this.contacts.set(id, contact);
    return contact;
  }
  
  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const existingContact = this.contacts.get(id);
    if (!existingContact) return undefined;
    
    const updatedContact: Contact = { 
      ...existingContact, 
      ...contactUpdate 
    };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }
  
  // Conversation operations
  async getConversationsForUser(userId: number): Promise<ConversationWithLastMessage[]> {
    const userConversations = Array.from(this.conversations.values()).filter(
      (conversation) => conversation.user_id === userId,
    );
    
    return userConversations.map(conversation => {
      // Find last message for each conversation
      const conversationMessages = Array.from(this.messages.values())
        .filter(message => message.conversation_id === conversation.id)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      
      const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : undefined;
      
      // Count unique contacts mentioned in this conversation
      const contactIds = new Set<number>();
      for (const message of conversationMessages) {
        const links = Array.from(this.contactLinks.values()).filter(
          link => link.message_id === message.id
        );
        
        for (const link of links) {
          contactIds.add(link.contact_id);
        }
      }
      
      return {
        ...conversation,
        lastMessage,
        contactCount: contactIds.size
      };
    }).sort((a, b) => {
      // Sort by creation date if no messages
      if (!a.lastMessage && !b.lastMessage) {
        return b.created_at.getTime() - a.created_at.getTime();
      }
      
      // Sort by last message date
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      
      return b.lastMessage.created_at.getTime() - a.lastMessage.created_at.getTime();
    });
  }
  
  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationIds++;
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id, 
      created_at: now 
    };
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async updateConversation(id: number, conversationUpdate: Partial<Conversation>): Promise<Conversation | undefined> {
    const existingConversation = this.conversations.get(id);
    if (!existingConversation) return undefined;
    
    const updatedConversation: Conversation = { 
      ...existingConversation, 
      ...conversationUpdate 
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  // Message operations
  async getMessagesForConversation(conversationId: number): Promise<MessageWithContactLinks[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(message => message.conversation_id === conversationId)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    
    return conversationMessages.map(message => {
      const contactLinks = Array.from(this.contactLinks.values())
        .filter(link => link.message_id === message.id);
      
      return {
        ...message,
        contactLinks
      };
    });
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageIds++;
    const now = new Date();
    const message: Message = { 
      ...insertMessage, 
      id, 
      created_at: now 
    };
    this.messages.set(id, message);
    return message;
  }
  
  // Contact links operations
  async createContactLink(insertContactLink: InsertContactLink): Promise<ContactLink> {
    const id = this.currentContactLinkIds++;
    const now = new Date();
    const contactLink: ContactLink = { 
      ...insertContactLink, 
      id, 
      created_at: now 
    };
    this.contactLinks.set(id, contactLink);
    return contactLink;
  }
  
  async getContactLinksForMessage(messageId: number): Promise<ContactLink[]> {
    return Array.from(this.contactLinks.values()).filter(
      link => link.message_id === messageId
    );
  }
  
  async getContactLinksForContact(contactId: number): Promise<ContactLink[]> {
    return Array.from(this.contactLinks.values()).filter(
      link => link.contact_id === contactId
    );
  }
  
  // Combined operations
  async getFrequentContactsForUser(userId: number, limit: number = 4): Promise<ContactWithMentionCount[]> {
    const userContacts = await this.getContactsForUser(userId);
    
    const contactWithCounts = await Promise.all(
      userContacts.map(async contact => {
        const contactLinks = await this.getContactLinksForContact(contact.id);
        return {
          ...contact,
          mentionCount: contactLinks.length
        };
      })
    );
    
    return contactWithCounts
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, limit);
  }
  
  async searchConversations(userId: number, query: string): Promise<ConversationWithLastMessage[]> {
    const normalizedQuery = query.toLowerCase();
    const userConversations = await this.getConversationsForUser(userId);
    
    return userConversations.filter(conversation => {
      // Search in conversation title
      if (conversation.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Search in messages
      const conversationMessages = Array.from(this.messages.values())
        .filter(message => message.conversation_id === conversation.id);
        
      return conversationMessages.some(message => 
        message.content.toLowerCase().includes(normalizedQuery)
      );
    });
  }
  
  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    const normalizedQuery = query.toLowerCase();
    const userContacts = await this.getContactsForUser(userId);
    
    return userContacts.filter(contact => {
      // Search in contact name or notes
      return (
        contact.name.toLowerCase().includes(normalizedQuery) ||
        (contact.notes && contact.notes.toLowerCase().includes(normalizedQuery))
      );
    });
  }
  
  async getContactsWithMentionCount(userId: number): Promise<ContactWithMentionCount[]> {
    const userContacts = await this.getContactsForUser(userId);
    
    const contactWithCounts = await Promise.all(
      userContacts.map(async contact => {
        const contactLinks = await this.getContactLinksForContact(contact.id);
        return {
          ...contact,
          mentionCount: contactLinks.length
        };
      })
    );
    
    return contactWithCounts.sort((a, b) => b.mentionCount - a.mentionCount);
  }
}

export const storage = new MemStorage();

// Add a demo user
(async () => {
  const demoUser = await storage.createUser({
    email: "demo@revocai.com",
    password: "password123",
    displayName: "John Doe"
  });
})();
