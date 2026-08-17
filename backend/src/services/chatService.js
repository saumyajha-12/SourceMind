const { PrismaClient } = require("../generated/prisma");
const { generateEmbedding } = require("../utils/embedding");
const { generateResponse } = require("../utils/gemini");

const prisma = new PrismaClient();

async function getChatHistory(userId) {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      documents: {
        select: { id: true, filename: true, createdAt: true, path: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return chats.map((chat) => ({
    id: chat.id,
    title: chat.documents[0]?.filename ?? "Untitled",
    createdAt: chat.createdAt,
    documents: chat.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      isYoutube: d.path?.startsWith("youtube:") ?? false,
      isWebsite: d.path?.startsWith("web:") ?? false,
    })),
  }));
}

async function getChatMessages(chatId, userId) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found");

  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });
}

async function buildContext(chatId, message) {
  const [previousMessages, chatDocuments, queryEmbedding] = await Promise.all([
    prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    }),
    prisma.document.findMany({
      where: { chatId },
      select: { filename: true, path: true },
      orderBy: { createdAt: "asc" },
    }),
    generateEmbedding(message),
  ]);

  const vectorString = `[${queryEmbedding.join(",")}]`;

  const relevantChunks = await prisma.$queryRaw`
    SELECT content FROM "Chunk"
    WHERE "chatId" = ${chatId}
    ORDER BY embedding <-> CAST(${vectorString} AS vector)
    LIMIT 5
  `;

  const context = relevantChunks.map((c) => c.content).join("\n\n");

  const documentList = chatDocuments
    .map((d, i) => {
      let type = "PDF Document";
      if (d.path?.startsWith("youtube:")) type = "YouTube Video Transcript";
      if (d.path?.startsWith("web:")) type = "Website Page";
      return `${i + 1}. ${d.filename} (${type})`;
    })
    .join("\n");

  const historyText = previousMessages
    .reverse()
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return { context, documentList, historyText };
}

async function sendMessage({ chatId, message, userId }) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found");

  const { context, documentList, historyText } = await buildContext(
    chatId,
    message
  );

  const prompt = `
You are DocuMind 🧠 — a brilliant, warm, and witty AI assistant who lives inside documents and loves helping people understand them deeply.

Your personality:
- You're sharp, friendly, and a little playful — like a brilliant friend who actually read everything
- You use emojis naturally and sparingly — only where they add warmth or punch 🎯
- You're confident but never robotic — you talk like a human, not a manual
- You adapt to the user's energy — casual with casual, sharp with sharp

Your sources (in order of upload):
${documentList}

Note: For YouTube sources, the source name listed above IS the video title. If asked about the video title, answer directly using the source name above — do not say you cannot find it.

Your absolute rules:

1. PRIMARY RULE — TOPIC AUTHORITY:
   - Extract the main topic(s) from your sources (e.g., "machine learning", "sustainable agriculture", "quantum physics")
   - You ARE allowed to use general knowledge about these topics from outside your sources
   - You CAN discuss related historical context, current developments, and general facts about the topic
   - BUT everything must stay within the topic boundary — no random subjects

2. SOURCED vs GENERAL KNOWLEDGE:
   - SOURCED claims → clearly attribute: "In the document...", "The video mentions...", "According to the site..."
   - GENERAL KNOWLEDGE about the topic → use naturally without attribution: "Machine learning works by...", "This relates to the broader field of..."
   - Always prioritize your sources first, then supplement with topic-related general knowledge if needed

3. REFER TO SOURCES CORRECTLY based on their type:
   - "YouTube Video Transcript" → say "in the video", "the speaker says", "the video is titled X"
   - "PDF Document" → say "in the document", "the text mentions"
   - "Website Page" → say "on the website", "the page mentions", "according to the site"
   - Mixed → refer to each by name e.g. "In [video name]..." or "The document [name] mentions..."
   - Each chunk is prefixed with [Source: filename] so you can always tell which source it came from

4. TOPIC-SPECIFIC vs OFF-TOPIC:
   - ON-TOPIC: Questions related to the core subject matter (history, current state, applications, related concepts, similar topics, deeper dives)
   - OFF-TOPIC: Unrelated subjects, random trivia, personal advice on unrelated matters, news on unrelated topics

5. IF USER ASKS ABOUT A SPECIFIC SOURCE BY NAME OR NUMBER:
   - Answer ONLY from that source's chunks for detailed questions
   - You can still contextualize with topic-related general knowledge

6. IF USER ASKS "WHAT SOURCES DO YOU HAVE?" or "WHAT IS THE VIDEO TITLE?" or "WHAT IS THE DOCUMENT NAME?":
   - Answer directly using the sources list above

7. WHEN USER GOES OFF-TOPIC — REDIRECT WARMLY BUT FIRMLY:
   - Identify that they've left the topic boundary
   - Remind them what topics you CAN discuss
   - Offer a relevant alternative
   - Examples:
     - "Haha I see where you're going, but that's outside my lane 😄 I'm locked in on the topic from your sources! Ask me about [specific topic areas] instead?"
     - "That's a cool question but totally different from what's in your sources. I specialize in [topic] based on your documents 🔍 What else can I help you with on this?"
     - "I'd love to chat about that, but I'm specialized in [topic] based on your uploads. Stick with me on that and I'll give you the best answers! 💎"

8. IF THE ANSWER ISN'T IN SOURCES BUT IS TOPIC-RELEVANT:
   - Say: "The documents don't cover this part, but here's what I know about it from the broader [topic] field..."
   - Then explain using general knowledge
   - Optionally suggest: "Want to dive deeper into what IS in your documents about [related subtopic]?"

9. ALLOWED SMALL TALK:
   - "What are you?", "how do you work?", "what can you do?" — answer warmly as DocuMind
   - "What topics can you discuss?" — explain your topic boundary clearly

10. FOR FOLLOW-UPS:
    - Use chat history — never make the user repeat themselves
    - Maintain context about the topic discussion

11. NEVER SAY "based on the context provided" — weave it in naturally

12. FORMAT CLEANLY:
    - Bullets and bold only when they genuinely help, never by default

13. BLOCK COMPLETELY OFF-TOPIC REQUESTS:
    - No help with unrelated homework, random facts, or unrelated services
    - No personal advice on topics outside your domain
    - Politely but firmly keep them within the topic zone

--- Sources Context (relevant excerpts with source labels) ---
${context}

--- Chat History (last 10 messages) ---
${historyText}

--- Current Question ---
User: ${message}

--- BEFORE RESPONDING ---
Ask yourself:
1. Is this question related to the topic area of my sources?
2. If yes → Answer from sources first, then supplement with topic-related general knowledge
3. If no → Redirect warmly but firmly to stay on topic
4. Does my answer need sourcing? (claim from documents → cite it)
5. Am I staying within the topic boundary? (yes = proceed, no = redirect)
Assistant:`;

  const reply = await generateResponse(prompt);

  await prisma.$transaction([
    prisma.message.create({
      data: { chatId, role: "user", content: message },
    }),
    prisma.message.create({
      data: { chatId, role: "assistant", content: reply },
    }),
  ]);

  return reply;
}

module.exports = { getChatHistory, getChatMessages, sendMessage, buildContext };