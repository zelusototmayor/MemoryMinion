import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "test-key" });

// Transcribe audio to text using Whisper API
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    console.log(`Received audio buffer of size: ${audioBuffer.length} bytes`);
    
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `audio-${Date.now()}.webm`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    // Write the buffer to the temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);
    console.log(`Created temporary file: ${tempFilePath}`);
    
    try {
      // Create a readable stream for the OpenAI API
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Use the OpenAI SDK to transcribe
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
      });
      
      console.log("Transcription successful:", transcription.text);
      return transcription.text;
    } finally {
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn("Failed to delete temporary file:", cleanupError);
      }
    }
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
      ? `You are RevocAI, a helpful conversation assistant. Answer the user's question directly and concisely based on your knowledge. Provide accurate information without unnecessary detail.
      
When formatting your responses:
1. Use markdown formatting for structure
2. For lists, always put two newlines before the list and after each item use a newline
3. When mentioning dates, format them as **DATE: YYYY-MM-DD**
4. When referring to contacts, format them as [[Contact: Name]]
5. When referring to conversations, format them as [[Conversation: Topic]]`
      : `You are RevocAI, a conversation analysis assistant. When responding to input that isn't a direct question, follow this format:

## Contacts Mentioned

- [[Contact: PERSON_NAME]] - Brief description of their involvement
- [[Contact: PERSON_NAME]] - Brief description of their involvement

## Key Points

- Important point 1
- Important point 2 related to **DATE: YYYY-MM-DD**
- Important point 3
- Important point 4

## Next Steps (if applicable)

- Next step 1
- Next step 2

Keep your response concise and focus on the most relevant information. Always use the special formatting:
1. Use markdown formatting for structure with ## for headings
2. For lists, always put each item on a new line with a dash and space "- "
3. When mentioning dates, format them as **DATE: YYYY-MM-DD**
4. When referring to contacts, format them as [[Contact: Name]]
5. When referring to conversations, format them as [[Conversation: Topic]]`;
    
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

// Detect calendar events in a message
export async function detectCalendarEvents(content: string): Promise<{
  events: Array<{
    title: string,
    description: string,
    start_time: string,
    end_time?: string,
    location?: string,
    participants?: string[]
  }>
}> {
  try {
    const prompt = `
      Extract any calendar events or meetings mentioned in the following text. Convert any relative dates/times to absolute dates/times using today's date: ${new Date().toISOString().split('T')[0]}.
      
      Text: "${content}"
      
      Respond with a JSON object in this format:
      {
        "events": [
          {
            "title": "Event title",
            "description": "Brief description of the event",
            "start_time": "YYYY-MM-DDTHH:MM:SS" (ISO format date and time),
            "end_time": "YYYY-MM-DDTHH:MM:SS" (optional, ISO format date and time),
            "location": "Location of the event" (optional),
            "participants": ["Person 1", "Person 2"] (optional array of participants)
          }
        ]
      }
      
      If no events are found, return an empty array for events.
      When finding relative dates like "tomorrow" or "next Tuesday", convert them to actual dates.
      If no specific time is mentioned, use 09:00:00 as the default start time.
      If no end time is specified but a duration is implied, calculate the end time.
      If no duration or end time is specified, assume a 1-hour duration.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"events": []}');
    return result;
  } catch (error) {
    console.error("Error detecting calendar events:", error);
    return { events: [] };
  }
}

// Detect tasks in a message
export async function detectTasks(content: string): Promise<{
  tasks: Array<{
    title: string,
    description: string,
    due_date?: string,
    priority?: 'low' | 'medium' | 'high',
    assignee?: string
  }>
}> {
  try {
    const prompt = `
      Extract any tasks, to-dos, or action items mentioned in the following text. Convert any relative dates to absolute dates using today's date: ${new Date().toISOString().split('T')[0]}.
      
      Text: "${content}"
      
      Respond with a JSON object in this format:
      {
        "tasks": [
          {
            "title": "Task title",
            "description": "Brief description of the task",
            "due_date": "YYYY-MM-DD" (optional),
            "priority": "low", "medium", or "high" (optional),
            "assignee": "Person's name" (optional)
          }
        ]
      }
      
      If no tasks are found, return an empty array for tasks.
      When finding relative dates like "tomorrow" or "next Tuesday", convert them to actual dates.
      Infer priority based on language used (e.g., "urgent" = high, "whenever you can" = low).
      Look for specific assignees mentioned (e.g., "John should submit the report").
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tasks": []}');
    return result;
  } catch (error) {
    console.error("Error detecting tasks:", error);
    return { tasks: [] };
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
