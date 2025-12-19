// import { OpenAI } from "openai";

// // Initialize OpenAI (you'll need to get an API key)
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function POST(req) {
//   try {
//     const { question, context } = await req.json();

//     if (!question) {
//       return new Response(JSON.stringify({ error: "Question is required" }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     // If you don't have OpenAI API key, use a simple fallback
//     if (!process.env.OPENAI_API_KEY) {
//       return new Response(
//         JSON.stringify({
//           answer: `I received your question: "${question}". To enable smart responses, add your OpenAI API key to environment variables.`,
//         }),
//         { status: 200, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     // Create prompt with context if available
//     const prompt = context
//       ? `Context from transcription: "${context.substring(0, 1000)}"\n\nQuestion: ${question}\n\nAnswer concisely based on the context if relevant, otherwise answer generally:`
//       : `Question: ${question}\n\nAnswer concisely:`;

//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful assistant that answers questions based on provided context. Keep answers concise and relevant.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       max_tokens: 150,
//       temperature: 0.7,
//     });

//     const answer = completion.choices[0]?.message?.content?.trim() || "I couldn't generate an answer.";

//     return new Response(JSON.stringify({ answer }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Q&A Error:", error);
    
//     // Fallback response
//     return new Response(
//       JSON.stringify({
//         answer: "I encountered an error. Please try again or check your OpenAI API configuration.",
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

export async function POST(req) {
  try {
    const { question, context } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Simple keyword-based responses
    const questionLower = question.toLowerCase();
    let answer = "";

    if (questionLower.includes("what") && questionLower.includes("name")) {
      answer = "I'm your Voice-to-Text assistant. You can call me Whisper AI.";
    } else if (questionLower.includes("how") && questionLower.includes("work")) {
      answer = "I use speech recognition to transcribe your voice in real-time. You can speak naturally and I'll convert it to text.";
    } else if (questionLower.includes("time")) {
      answer = `The current time is ${new Date().toLocaleTimeString()}.`;
    } else if (questionLower.includes("date")) {
      answer = `Today is ${new Date().toLocaleDateString()}.`;
    } else if (context && context.includes(questionLower.split(" ")[0])) {
      // Try to find answer in context
      const contextLower = context.toLowerCase();
      const words = questionLower.split(" ");
      for (const word of words) {
        if (word.length > 3 && contextLower.includes(word)) {
          const start = Math.max(0, contextLower.indexOf(word) - 50);
          const end = Math.min(contextLower.length, contextLower.indexOf(word) + 100);
          answer = `Based on your transcription: "${context.substring(start, end)}..."`;
          break;
        }
      }
    } else {
      answer = `I heard you ask: "${question}". For more intelligent responses, please configure the OpenAI API.`;
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Q&A Error:", error);
    return new Response(
      JSON.stringify({
        answer: "Thanks for your question. I'm processing it now.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}