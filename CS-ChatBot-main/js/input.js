/**
 * ============================================================
 *  INPUT COMPONENT — window.InputComponent
 * ============================================================
 */
(function () {

  function InputComponent(inputId, sendBtnId, onSend) {
    this.input = document.getElementById(inputId);
    this.sendBtn = document.getElementById(sendBtnId);
    this.onSend = onSend;
    this.isDisabled = false;
    this.MAX_CHARS = 2000;
    this._init();
  }

  InputComponent.prototype._init = function () {
    var self = this;

    this.sendBtn.addEventListener("click", function () { self._handleSend(); });

    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self._handleSend();
      }
    });

    this.input.addEventListener("input", function () {
      self._autoResize();
      self._updateCharCount();
      self._updateSendButton();
    });

    this.input.addEventListener("focus", function () {
      var wrapper = self.input.closest(".input-wrapper");
      if (wrapper) wrapper.classList.add("focused");
    });

    this.input.addEventListener("blur", function () {
      var wrapper = self.input.closest(".input-wrapper");
      if (wrapper) wrapper.classList.remove("focused");
    });

    this._updateSendButton();
  };

  InputComponent.prototype._handleSend = function () {
    if (this.isDisabled) return;
    var text = this.input.value.trim();
    if (!text) return;
    this.input.value = "";
    this._autoResize();
    this._updateCharCount();
    this._updateSendButton();
    this.onSend(text);
  };

  InputComponent.prototype._autoResize = function () {
    this.input.style.height = "auto";
    var max = 160;
    var scrollH = this.input.scrollHeight;
    this.input.style.height = Math.min(scrollH, max) + "px";
    this.input.style.overflowY = scrollH > max ? "auto" : "hidden";
  };

  InputComponent.prototype._updateCharCount = function () {
    var count = this.input.value.length;
    var counter = document.getElementById("charCount");
    if (!counter) return;
    counter.textContent = count + "/" + this.MAX_CHARS;
    counter.classList.toggle("char-warning", count > this.MAX_CHARS * 0.85);
    counter.classList.toggle("char-danger", count > this.MAX_CHARS);
  };

  InputComponent.prototype._updateSendButton = function () {
    var hasText = this.input.value.trim().length > 0;
    var overLimit = this.input.value.length > this.MAX_CHARS;
    var canSend = hasText && !overLimit && !this.isDisabled;
    this.sendBtn.disabled = !canSend;
    this.sendBtn.classList.toggle("btn-active", canSend);
  };

  InputComponent.prototype.disable = function () {
    this.isDisabled = true;
    this.input.disabled = true;
    this.sendBtn.disabled = true;
    this.input.placeholder = "CS-BOT is thinking…";
    var wrapper = this.input.closest(".input-wrapper");
    if (wrapper) wrapper.classList.add("disabled");
  };

  InputComponent.prototype.enable = function () {
    this.isDisabled = false;
    this.input.disabled = false;
    this.input.placeholder = "Ask CS-BOT anything…";
    var wrapper = this.input.closest(".input-wrapper");
    if (wrapper) wrapper.classList.remove("disabled");
    this._updateSendButton();
    var self = this;
    setTimeout(function () { self.input.focus(); }, 100);
  };

  InputComponent.prototype.focus = function () {
    this.input.focus();
  };

  window.InputComponent = InputComponent;
})();
