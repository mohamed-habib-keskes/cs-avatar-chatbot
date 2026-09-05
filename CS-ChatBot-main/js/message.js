/**
 * ============================================================
 *  MESSAGE COMPONENT — window.MessageComponent
 * ============================================================
 */
(function () {

  function parseMarkdown(text) {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```([a-zA-Z]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="msg-code-block"><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code class='msg-inline-code'>$1</code>");

    // Headings
    html = html.replace(/^### (.*$)/gim, "<h4 class='msg-heading'>$1</h4>");
    html = html.replace(/^## (.*$)/gim, "<h3 class='msg-heading'>$1</h3>");
    html = html.replace(/^# (.*$)/gim, "<h3 class='msg-heading'>$1</h3>");

    // Horizontal rule
    html = html.replace(/^---$/gim, "<hr class='msg-divider'/>");

    // Bold & Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^\*\n]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

    // Lists
    html = html.replace(/^[•\-\*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul class='msg-list'>$1</ul>");

    // Line breaks
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  const ROBOT_MINI_SVG = `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="miniEyeG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#FF9A3C"/>
          <stop offset="100%" style="stop-color:#FF6B00"/>
        </radialGradient>
      </defs>
      <rect x="6" y="10" width="20" height="16" rx="5" fill="#1E1E38" stroke="#FF7A00" stroke-width="1.5"/>
      <rect x="12" y="6" width="8" height="5" rx="2" fill="#252540" stroke="#FF7A00" stroke-width="1"/>
      <circle cx="11" cy="17" r="3" fill="url(#miniEyeG)"/>
      <circle cx="21" cy="17" r="3" fill="url(#miniEyeG)"/>
      <path d="M 11 23 Q 16 26 21 23" stroke="#FF7A00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`;

  const USER_SVG = `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="12" r="6" fill="currentColor" opacity="0.9"/>
      <path d="M4 28 C4 20 28 20 28 28" fill="currentColor" opacity="0.7"/>
    </svg>`;

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function createMessageElement(role, text, timestamp) {
    timestamp = timestamp || new Date();
    const wrapper = document.createElement("div");
    wrapper.className = `msg-wrapper msg-${role}`;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";

    if (role === "user") {
      avatar.innerHTML = USER_SVG;
      avatar.title = "You";
    } else if (role === "error") {
      avatar.innerHTML = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.2"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="currentColor">⚠</text></svg>`;
    } else {
      avatar.innerHTML = ROBOT_MINI_SVG;
      avatar.title = "CS-BOT";
    }

    const content = document.createElement("div");
    content.className = "msg-content";

    if (role === "assistant") {
      const name = document.createElement("span");
      name.className = "msg-sender-name";
      name.textContent = "CS-BOT";
      content.appendChild(name);
    }

    const textEl = document.createElement("div");
    textEl.className = "msg-text";
    if (role === "user") {
      textEl.textContent = text;
    } else {
      textEl.innerHTML = parseMarkdown(text || "...");
    }

    const footerEl = document.createElement("div");
    footerEl.className = "msg-footer";

    const timeEl = document.createElement("span");
    timeEl.className = "msg-timestamp";
    timeEl.textContent = formatTime(timestamp);
    footerEl.appendChild(timeEl);

    if (role === "assistant") {
      const speakBtn = document.createElement("button");
      speakBtn.className = "msg-speak-btn";
      speakBtn.setAttribute("aria-label", "Listen to this message");
      speakBtn.title = "Listen to CS-BOT";
      speakBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      speakBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (window.VoiceService) {
          var rawText = textEl.textContent || text;
          speakBtn.classList.add("is-speaking");
          window.VoiceService.speak(
            rawText,
            function () { speakBtn.classList.add("is-speaking"); },
            function () { speakBtn.classList.remove("is-speaking"); }
          );
        }
      });
      footerEl.appendChild(speakBtn);
    }

    content.appendChild(textEl);
    content.appendChild(footerEl);

    if (role === "user") {
      bubble.appendChild(content);
      bubble.appendChild(avatar);
    } else {
      bubble.appendChild(avatar);
      bubble.appendChild(content);
    }

    wrapper.appendChild(bubble);

    requestAnimationFrame(function () { wrapper.classList.add("msg-visible"); });
    return wrapper;
  }

  function updateMessageText(wrapper, text, isStreaming) {
    if (!wrapper) return;
    var textEl = wrapper.querySelector(".msg-text");
    if (textEl) {
      var cursor = isStreaming !== false ? '<span class="stream-cursor">|</span>' : '';
      textEl.innerHTML = parseMarkdown(text) + cursor;
    }
  }

  function createTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper msg-assistant";
    wrapper.id = "typingIndicator";
    wrapper.innerHTML = `
      <div class="msg-bubble">
        <div class="msg-avatar">${ROBOT_MINI_SVG}</div>
        <div class="msg-content">
          <span class="msg-sender-name">CS-BOT</span>
          <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    requestAnimationFrame(function () { wrapper.classList.add("msg-visible"); });
    return wrapper;
  }

  window.MessageComponent = {
    createMessageElement,
    updateMessageText,
    createTypingIndicator,
    parseMarkdown,
  };
})();
