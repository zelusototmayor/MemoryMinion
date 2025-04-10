import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "test-key" });

// Transcribe audio to text using Whisper API
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file to use with OpenAI API
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Create a temporary file
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a file object that OpenAI can use
    const file = fs.createReadStream(tempFilePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temporary audio file:", cleanupError);
    }

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
    const isQuestion = content.trim().endsWith("?") || 
                       content.toLowerCase().includes("what") ||
                       content.toLowerCase().includes("why") ||
                       content.toLowerCase().includes("how") ||
                       content.toLowerCase().includes("when") ||
                       content.toLowerCase().includes("where") ||
                       content.toLowerCase().includes("who") ||
                       content.toLowerCase().includes("can you") ||
                       content.toLowerCase().includes("could you");
    
    const systemPrompt = isQuestion 
      ? "You are RevocAI, a helpful conversation assistant. Answer the user's question directly and concisely based on your knowledge. Provide accurate information without unnecessary detail."
      : `You are RevocAI, a conversation analysis assistant. When responding to input that isn't a direct question, follow this format:

1. Extract any important contacts/entities mentioned in the message.
2. Organize the key information into bullet points (3-5 bullet points, as appropriate).
3. Keep your response concise and focus on the most relevant information.

Example input: "I had a meeting with John from Marketing about the Q4 campaign. He suggested we increase the budget by 15% and target new demographics. Sarah from Finance agreed but wanted to review the numbers first."

Example response:
Contacts mentioned:
• John (Marketing) - Suggested increasing budget for Q4 campaign
• Sarah (Finance) - Agreed pending financial review

Key points:
• Discussion about Q4 marketing campaign
• Proposal to increase budget by 15%
• Plans to target new demographics
• Financial review needed before proceeding`;
    
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...conversationHistory,
      { role: "user" as const, content },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: isQuestion ? 0.7 : 0.3, // Lower temperature for analytical responses
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
