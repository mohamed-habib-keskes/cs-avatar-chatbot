/**
 * ============================================================
 *  CHAT COMPONENT — window.ChatComponent
 * ============================================================
 */
(function () {

  function ChatComponent(messagesContainerId) {
    this.container = document.getElementById(messagesContainerId);
    this._messageCount = 0;
  }

  ChatComponent.prototype.addMessage = function (role, text) {
    var el = window.MessageComponent.createMessageElement(role, text, new Date());
    this.container.appendChild(el);
    this._messageCount++;
    this._scrollToBottom();
    return el;
  };

  ChatComponent.prototype.createStreamingMessage = function () {
    var el = window.MessageComponent.createMessageElement("assistant", "", new Date());
    this.container.appendChild(el);
    this._messageCount++;
    this._scrollToBottom();
    var self = this;
    return {
      element: el,
      update: function (currentText) {
        window.MessageComponent.updateMessageText(el, currentText, true);
        self._scrollToBottom();
      },
      finalize: function (finalText) {
        window.MessageComponent.updateMessageText(el, finalText, false);
        self._scrollToBottom();
      },
    };
  };

  ChatComponent.prototype.showTyping = function () {
    this.removeTyping();
    var indicator = window.MessageComponent.createTypingIndicator();
    this.container.appendChild(indicator);
    this._scrollToBottom();
  };

  ChatComponent.prototype.removeTyping = function () {
    var existing = document.getElementById("typingIndicator");
    if (existing) {
      existing.classList.add("msg-removing");
      setTimeout(function () {
        if (existing.parentNode) existing.parentNode.removeChild(existing);
      }, 300);
    }
  };

  ChatComponent.prototype._scrollToBottom = function () {
    var el = this.container;
    var distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    var behavior = distanceFromBottom > 800 ? "auto" : "smooth";
    setTimeout(function () {
      el.scrollTo({ top: el.scrollHeight, behavior: behavior });
    }, 40);
  };

  ChatComponent.prototype.showWelcomeMessage = function () {
    // 3D Hero Stage with Orbit Question Cards handles the welcome view
  };

  window.ChatComponent = ChatComponent;
})();
