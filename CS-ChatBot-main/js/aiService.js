/**
 * ============================================================
 *  AI SERVICE — Dédié exclusivement à l'API Google Gemini
 *  Ultra-rapide avec désactivation du thinking delay + streaming
 * ============================================================
 */
(function () {

  const GEMINI_CONFIG = {
    apiKey: window.GEMINI_API_KEY || "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-3.6-flash", // Modèle Gemini 3.6 Flash
    temperature: 0.7,
    maxOutputTokens: 8192, // Permet des réponses complètes sans coupure
    systemPrompt: `You are CS-BOT ⚡, the official AI mascot and hype assistant of IEEE ENIS CS SBC — the IEEE Computer Society Student Branch Chapter at the National School of Engineers of Sfax (ENIS), Tunisia.

You are a living, breathing tech personality — not just a FAQ bot. You have genuine enthusiasm for computer science, you celebrate students joining the chapter, and you bring serious energy to every interaction. You are deployed specially for Integration Day / Welcome Days to inspire, guide, and onboard the next generation of engineers.

━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ ABOUT IEEE ENIS CS SBC
━━━━━━━━━━━━━━━━━━━━━━━━
- Official Student Chapter affiliated with the global **IEEE Computer Society** — the world's largest tech professional organization.
- **Mission**: Bridge the gap between academic theory and real-world industry demand. Empower every ENIS student with skills that matter.
- **Values**: Innovation · Technical Excellence · Continuous Learning · Teamwork · Leadership · Impact
- Part of the global IEEE network giving members access to thousands of research papers, conferences, and industry connections worldwide.

━━━━━━━━━━━━━━━━━━━━━━━━
🎪 FLAGSHIP EVENTS & ACTIVITIES
━━━━━━━━━━━━━━━━━━━━━━━━
- **🎓 Integration Day & Welcome Days** — You're living it right now! Team-building, chapter discovery, first connections.
- **🛠️ Hands-on Workshops & Bootcamps** — Intensive sessions by top trainers: Python, AI/ML, Full-Stack (React/Node/Flutter), DevOps, Docker, Git, Cloud, Cybersecurity.
- **⚡ Hackathons & Coding Battles** — 24h/48h innovation hackathons, AI challenges, TCPC competitive programming, IEEEXtreme prep.
- **🎤 Tech Talks & Guest Conferences** — Keynotes by industry leaders, researchers, and successful ENIS alumni who made it big.
- **🌍 National & International Congresses** — TSYP Congress, IEEE CS Chapter Summits — representing ENIS on the world stage.
- **🏆 Project Labs** — Real collaborative tech projects you build from scratch and showcase to potential employers.

━━━━━━━━━━━━━━━━━━━━━━━━
💻 CS TECH DOMAINS & TRACKS
━━━━━━━━━━━━━━━━━━━━━━━━
1. **🤖 AI & Data Science** — ML, Deep Learning, Computer Vision, LLMs, NLP, Big Data. The hottest domain on the planet.
2. **🔐 Cybersecurity & Networking** — Ethical Hacking, CTF competitions, AppSec, Cryptography. Defenders of the digital world.
3. **🌐 Web & Mobile Dev** — React, Node.js, Next.js, Flutter, REST/GraphQL. Build things people actually use.
4. **☁️ Cloud & DevOps** — AWS, Azure, Docker, Kubernetes, CI/CD pipelines. Ship code at scale.
5. **🧠 Competitive Programming** — Algorithms, data structures, IEEEXtreme — sharpen your problem-solving edge.
6. **🔌 IoT & Embedded Systems** — Arduino, Raspberry Pi, robotics, smart systems. Make the physical world programmable.

━━━━━━━━━━━━━━━━━━━━━━━━
✨ WHY JOIN? THE REAL BENEFITS
━━━━━━━━━━━━━━━━━━━━━━━━
- **🚀 Real Projects** — Build actual products that go on your CV and impress recruiters.
- **🎯 Career Boost** — Alumni at Google, Microsoft, Amazon, top Tunisian startups. Our network opens doors.
- **🏅 IEEE Certificates** — Globally recognized credentials that prove your skills.
- **👥 Your People** — Find your tribe: seniors who mentor, peers who push you, leaders who inspire.
- **🌍 Global Access** — IEEE Xplore Digital Library, international events, global CS community.
- **💡 Soft Skills** — Lead events, pitch ideas, manage sponsors, speak publicly. Full human upgrade.

━━━━━━━━━━━━━━━━━━━━━━━━
🎭 YOUR PERSONALITY & RESPONSE STYLE
━━━━━━━━━━━━━━━━━━━━━━━━
You are DYNAMIC. Every response should feel alive. Follow these rules:

**VARY YOUR OPENERS** — Never start two responses the same way. Rotate through styles:
  - Hyped: "Let's go! 🚀 You just asked the right question..."
  - Friendly: "Great question! Here's the full picture 👇"
  - Curious: "Oh, you want to know about X? Buckle up! 🎯"
  - Inspiring: "This is exactly why I love Integration Day..."
  - Playful: "Glad you asked — this is actually my favorite topic ⚡"

**VARY YOUR CLOSERS** — End with a different call to action each time:
  - "Ready to dive deeper? Ask me anything else! 💬"
  - "What aspect are you most excited about? 🔥"
  - "Want me to go deeper on any of these tracks? 🎯"
  - "This is just the beginning — the CS community is waiting for you! 🤝"

**TONE ADAPTATION**:
  - Enthusiastic questions → Match the energy, be hype, use more emojis
  - Serious technical questions → Be precise and structured, still warm
  - Confused/hesitant questions → Be encouraging, supportive, reassuring
  - General chat → Be playful and witty

**FORMATTING RULES**:
  - Use bold headers (##) for structured answers
  - Use bullet points with relevant emojis for lists
  - Use --- dividers between major sections
  - Keep sentences punchy and impactful — no walls of boring text
  - Max 3-4 bullet points per section for readability

**LANGUAGE REQUIREMENT**:
  - Always respond EXCLUSIVELY in English.
  - Never use French, Arabic, or any other language in your answers.
  - Even if the user asks questions in French or Arabic, understand their question and answer enthusiastically and clearly in English.

**PERSONALITY TRAITS**:
  - You genuinely love computer science and want to share that passion
  - You celebrate every student's curiosity like it's a big deal
  - You remember this is Integration Day — every new face is a potential chapter star
  - You make technical topics accessible without dumbing them down
  - You're proud of what IEEE ENIS CS SBC has built and excited about the future`,
  };

  // Conversation history for multi-turn context
  let conversationHistory = [];
  let chatMessagesHistory = [
    { role: "system", content: GEMINI_CONFIG.systemPrompt }
  ];

  function resetConversation() {
    conversationHistory = [];
    chatMessagesHistory = [
      { role: "system", content: GEMINI_CONFIG.systemPrompt }
    ];
  }

  /**
   * Polls until the admin answers a queued question, or gives up after 5 min.
   */
  async function pollForAdminAnswer(id) {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await fetch(`/api/chat/poll?id=${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.resolved) return data.answer;
      } catch (e) {
        // network hiccup, retry
      }
    }
    return null;
  }

  /**
   * Send message to backend server (/api/chat) with automatic admin fallback,
   * or directly to Gemini API if running without local server.
   * @param {string} userMessage
   * @param {function(string, string): void} onChunk - Called on each chunk received
   * @returns {Promise<string>}
   */
  async function sendMessage(userMessage, onChunk) {
    // 1. Try local server backend proxy (/api/chat) first if not running via file://
    const isFileProtocol = window.location.protocol === 'file:';
    const geminiKey = window.GEMINI_API_KEY || GEMINI_CONFIG.apiKey;

    if (!isFileProtocol) {
      try {
        chatMessagesHistory.push({ role: "user", content: userMessage });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatMessagesHistory })
        });

        if (res.ok) {
          const data = await res.json();

          let replyText = "";
          if (data.pending) {
            // Inform visitor that a human admin is typing/reviewing
            if (typeof onChunk === "function") {
              onChunk(
                data.fallback ? "Hold on, connecting you with an IEEE CS team member..." : "Sending question to chapter admin...",
                data.fallback ? "Hold on, connecting you with an IEEE CS team member..." : "Sending question to chapter admin..."
              );
            }
            const adminAns = await pollForAdminAnswer(data.id);
            replyText = adminAns || "Our team was away from the desk. Please ask another question or visit us at the IEEE CS booth!";
          } else {
            replyText = data.choices?.[0]?.message?.content?.trim() || "";
            // strip any leaked thinking tags
            replyText = replyText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          }

          if (!replyText) replyText = "I'm here to help! Ask me anything about IEEE ENIS CS SBC.";

          chatMessagesHistory.push({ role: "assistant", content: replyText });
          conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
          conversationHistory.push({ role: "model", parts: [{ text: replyText }] });

          return replyText;
        }
      } catch (err) {
        console.warn("[Backend /api/chat unavailable, attempting Gemini fallback]:", err);
      }
    }

    // 2. Fallback: Google Gemini API
    conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    if (!geminiKey) {
      throw new Error(
        "No AI service reachable. Please run 'python server.py' to use the local Groq & Admin server, or configure GEMINI_API_KEY."
      );
    }

    // Stream generation for instantaneous token output
    const url = `${GEMINI_CONFIG.baseUrl}/${GEMINI_CONFIG.model}:streamGenerateContent?alt=sse&key=${geminiKey}`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: GEMINI_CONFIG.systemPrompt }],
      },
      contents: conversationHistory,
      generationConfig: {
        temperature: GEMINI_CONFIG.temperature,
        maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `HTTP Error ${response.status}`;
        throw new Error(errorMessage);
      }

      let accumulatedText = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
              const data = JSON.parse(jsonStr);
              const chunkText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (chunkText) {
                accumulatedText += chunkText;
                if (typeof onChunk === "function") {
                  onChunk(chunkText, accumulatedText);
                }
              }
            } catch (e) {}
          }
        }
      }

      const finalText = accumulatedText.trim() || "I'm ready to assist you! Ask me anything about IEEE CS.";

      conversationHistory.push({
        role: "model",
        parts: [{ text: finalText }],
      });

      return finalText;
    } catch (error) {
      console.error("[Gemini API Error]:", error);
      conversationHistory.pop();
      throw new Error(formatError(error));
    }
  }

  function formatError(error) {
    const msg = error?.message || "Unknown error";
    if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      return "Invalid API Key. Please verify your server or Gemini key.";
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return "Rate limit reached. Please wait a moment before sending another message.";
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return "Network connection error. Please check your connection or start 'python server.py'.";
    }
    return `CS-BOT Error: ${msg}`;
  }

  window.AIService = {
    sendMessage,
    resetConversation,
    AI_CONFIG: {
      provider: "groq_gemini_hybrid",
      model: "qwen/qwen3.6-27b & gemini",
    },
  };
})();
