import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "test-key" });

// Transcribe audio to text using Whisper API
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new Blob([audioBuffer], { type: 'audio/webm' }),
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio: " + (error as Error).message);
  }
}

// Process user message with AI
export async function processMessage(
  content: string,
  conversationHistory: Array<{ role: "user" | "assistant", content: string }>
): Promise<string> {
  try {
    const messages = [
      {
        role: "system",
        content: "You are RevocAI, a helpful conversation assistant. Provide concise, informative responses.",
      },
      ...conversationHistory,
      { role: "user", content },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Error processing message with AI:", error);
    throw new Error("Failed to process message: " + (error as Error).message);
  }
}

// Detect potential contacts in a message
export async function detectContacts(content: string): Promise<{
  potentialContacts: Array<{ name: string, contextInfo: string }>
}> {
  try {
    const prompt = `
      Extract any person names mentioned in the following text. For each name, provide any context about them (like their role, company, etc.) if available.
      
      Text: "${content}"
      
      Respond with a JSON object in this format:
      {
        "potentialContacts": [
          {"name": "Full Name", "contextInfo": "Additional context like role, company, etc."}
        ]
      }
      
      If no names are found, return an empty array for potentialContacts.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"potentialContacts": []}');
    return result;
  } catch (error) {
    console.error("Error detecting contacts:", error);
    return { potentialContacts: [] };
  }
}

// Generate a title for a conversation based on messages
export async function generateConversationTitle(messages: Array<{ sender: string, content: string }>): Promise<string> {
  if (messages.length === 0) return "New Conversation";

  try {
    const content = messages.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Create a brief, descriptive title (maximum 6 words) for this conversation:\n\n${content}\n\nTitle:`,
        },
      ],
    });

    const title = response.choices[0].message.content?.trim() || "New Conversation";
    return title.replace(/^["']|["']$/g, ''); // Remove quotes if present
  } catch (error) {
    console.error("Error generating conversation title:", error);
    return "New Conversation";
  }
}

// Search for relevant information across conversations and contacts
export async function searchInformation(
  userId: number,
  query: string,
  conversationData: Array<{ id: number, title: string, messages: Array<{ sender: string, content: string, created_at: string }> }>,
  contactData: Array<{ id: number, name: string, notes?: string }>
): Promise<string> {
  try {
    const prompt = `
      User query: "${query}"
      
      Available conversations:
      ${conversationData.map(conv => {
        return `
          Conversation: ${conv.title}
          ${conv.messages.map(msg => `  ${msg.sender === 'user' ? 'User' : 'Assistant'} (${new Date(msg.created_at).toLocaleString()}): ${msg.content}`).join('\n')}
        `;
      }).join('\n\n')}
      
      Available contacts:
      ${contactData.map(contact => {
        return `
          Contact: ${contact.name}
          ${contact.notes ? `Notes: ${contact.notes}` : ''}
        `;
      }).join('\n\n')}
      
      Based on the user's query and the available data, provide a concise and helpful answer.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a search assistant that retrieves and summarizes relevant information from conversation and contact data."
        },
        { role: "user", content: prompt }
      ],
    });

    return response.choices[0].message.content || "I couldn't find relevant information for your query.";
  } catch (error) {
    console.error("Error searching information:", error);
    throw new Error("Failed to search information: " + (error as Error).message);
  }
}
