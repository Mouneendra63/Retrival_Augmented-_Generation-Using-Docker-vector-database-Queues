
import { NextRequest } from 'next/server';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { QdrantVectorStore } from '@langchain/qdrant';
import dotenv from 'dotenv';

dotenv.config();

// Configure your Gemini API
const GEMINI_API_KEY = 'AIzaSyBm1miB1-AyFoMHTF66LtZEXHKWX7ggUlw'; 
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'; // Using Gemini 2.0 Flash (fastest)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userQuery = body.message;

    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'Missing message field in body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load your local embeddings (HuggingFace MiniLM)
    const embeddings = new HuggingFaceTransformersEmbeddings({
      modelName: 'Xenova/all-MiniLM-L6-v2',
    });

    // Connect to existing Qdrant collection
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://localhost:6333',
        collectionName: 'Embedding_Testing', // your collection name
      }
    );

    // Find related documents (RAG retrieval)
    const retriever = vectorStore.asRetriever({ k: 2 });
    const relatedDocs = await retriever.invoke(userQuery);

    // Build a system prompt for Gemini
    const SYSTEM_PROMPT = `
You are a helpful AI Assistant.
Answer the user's query strictly based on the following PDF context.

Context:
${JSON.stringify(relatedDocs)}

If the answer is not available in the context, reply: "Sorry, I couldn't find that in the document."
`;

    // Call Google Gemini API
    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + "\n\nUser question: " + userQuery }],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const text = await geminiResponse.text();
      throw new Error(`Gemini API Error: ${geminiResponse.status} - ${text}`);
    }

    const geminiData = await geminiResponse.json();

    const outputText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated.';

    return new Response(JSON.stringify({
      message: outputText,
      docs: relatedDocs,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}