/**
 * ============================================================
 *  APP.JS — Main Orchestrator (Centered 3D Hero + Orbit Cards)
 * ============================================================
 */
(function () {
  'use strict';

  // Rotating hero welcome phrases
  var HERO_PHRASES = [
    "How can I assist you today?",
    "What do you want to explore? ⚡",
    "Ask me anything about IEEE CS!",
    "Ready to start your journey? 🚀",
    "Your tech adventure starts here 🎯",
    "What's on your mind? 💬",
    "Let's build something great together!",
    "Curious about CS? I've got answers! 🔥",
  ];

  function App() {
    this.robot    = null;
    this.chat     = null;
    this.input    = null;
    this.chatArea = null;
    this._phraseIndex = 0;
    this._phraseTimer = null;
    this._init();
  }

  App.prototype._init = function () {
    var self = this;

    this.chatArea = document.getElementById("chatArea");
    this.robot    = new window.RobotComponent("robotContainer");
    this.chat     = new window.ChatComponent("messagesContainer");
    this.input    = new window.InputComponent("userInput", "sendBtn", function (text) {
      self._handleUserSend(text);
    });

  // ── Spark Burst Effect Helper ────────────────────────────
  function createSparkBurst(x, y) {
    var count = 12;
    for (var i = 0; i < count; i++) {
      var spark = document.createElement("span");
      spark.className = "card-spark";
      var angle = (Math.PI * 2 / count) * i + (Math.random() * 0.4 - 0.2);
      var distance = 35 + Math.random() * 55;
      var dx = (Math.cos(angle) * distance).toFixed(1) + "px";
      var dy = (Math.sin(angle) * distance).toFixed(1) + "px";
      spark.style.left = x + "px";
      spark.style.top = y + "px";
      spark.style.setProperty("--dx", dx);
      spark.style.setProperty("--dy", dy);
      var size = (4 + Math.random() * 4).toFixed(1);
      spark.style.width = size + "px";
      spark.style.height = size + "px";
      document.body.appendChild(spark);
      setTimeout(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }.bind(null, spark), 680);
    }
  }

  // ── Ripple Effect Helper ─────────────────────────────────
  function createCardRipple(card, e) {
    var rect = card.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var size = Math.max(rect.width, rect.height) * 2;
    var ripple = document.createElement("span");
    ripple.className = "card-ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    card.appendChild(ripple);
    setTimeout(function () {
      if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 600);
  }

    // Handle clicks on Question Cards, Mascot, & Suggestion Chips
    document.addEventListener("click", function (e) {
      var card = e.target.closest(".question-card");
      if (card) {
        createCardRipple(card, e);
        createSparkBurst(e.clientX, e.clientY);
        var msg = card.getAttribute("data-msg");
        if (msg) {
          self.robot.waveHello();
          self._handleUserSend(msg);
        }
        return;
      }

      var heroMascot = e.target.closest(".hero-center-spacer, .hero-brand-pill");
      if (heroMascot) {
        createSparkBurst(e.clientX, e.clientY);
        if (self.robot) self.robot.poke();
        return;
      }

      var chip = e.target.closest(".suggestion-chip");
      if (chip) {
        var chipMsg = chip.getAttribute("data-msg");
        if (chipMsg) self._handleUserSend(chipMsg);
      }
    });

    // 3D Magnetic Tilt & Light Following for Question Cards
    document.querySelectorAll(".question-card").forEach(function (card) {
      var pos = card.getAttribute("data-card-pos") || "";

      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", x + "px");
        card.style.setProperty("--mouse-y", y + "px");

        // 3D Magnetic tilt relative to card center
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotX = ((y - centerY) / centerY) * -10;
        var rotY = ((x - centerX) / centerX) * 10;
        card.style.transform = "perspective(1000px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg) translateY(-6px) scale(1.035)";
      });

      card.addEventListener("mouseenter", function () {
        if (self.robot && (self.robot.state === 'idle' || self.robot.state === 'happy')) {
          self.robot.setState("happy");
          // Target robot gaze according to card position
          if (pos === "tl") {
            self.robot._mouse.targetX = -0.85;
            self.robot._mouse.targetY = 0.45;
          } else if (pos === "bl") {
            self.robot._mouse.targetX = -0.85;
            self.robot._mouse.targetY = -0.35;
          } else if (pos === "tr") {
            self.robot._mouse.targetX = 0.85;
            self.robot._mouse.targetY = 0.45;
          } else if (pos === "br") {
            self.robot._mouse.targetX = 0.85;
            self.robot._mouse.targetY = -0.35;
          } else {
            var isLeft = card.closest(".orbit-left");
            self.robot._mouse.targetX = isLeft ? -0.8 : 0.8;
            self.robot._mouse.targetY = 0.1;
          }
        }
      });

      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
        if (self.robot && self.robot.state === 'happy') {
          self.robot.setState("idle");
          self.robot._mouse.targetX = 0;
          self.robot._mouse.targetY = 0;
        }
      });
    });

    // Voice Toggle Button setup
    var voiceToggleBtn = document.getElementById("voiceToggleBtn");
    var voiceStateLabel = document.getElementById("voiceStateLabel");

    function updateVoiceUI() {
      if (!voiceToggleBtn || !window.VoiceService) return;
      if (window.VoiceService.enabled) {
        voiceToggleBtn.classList.add("voice-active");
        if (voiceStateLabel) voiceStateLabel.textContent = "ON";
      } else {
        voiceToggleBtn.classList.remove("voice-active");
        if (voiceStateLabel) voiceStateLabel.textContent = "OFF";
      }
    }

    if (voiceToggleBtn) {
      updateVoiceUI();
      voiceToggleBtn.addEventListener("click", function () {
        var isNowOn = window.VoiceService.toggle();
        updateVoiceUI();
        if (isNowOn) {
          if (window.VoiceService) window.VoiceService.playSuccess();
          self.robot.waveHello();
          window.VoiceService.speak("Voice mode activated! I am ready to talk with you.");
        } else {
          if (window.VoiceService) window.VoiceService.playChirp();
          self.robot.setState("idle");
        }
      });
    }

    // New conversation button
    var newChatBtn = document.getElementById("newChatBtn");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", function () {
        self._newChat();
      });
    }

    this._initQrCode();
    this._initParticles();
    this._startHeroPhraseRotation();
    this.input.focus();

    console.log("[CS-BOT] App initialized.");
  };

  App.prototype._handleUserSend = function (text) {
    var self = this;
    var voiceToggleBtn = document.getElementById("voiceToggleBtn");

    if (window.VoiceService) {
      window.VoiceService.stop();
      window.VoiceService.playChirp();
    }

    // Stop phrase rotation when chat starts
    this._stopHeroPhraseRotation();

    // Transition arena to conversation mode & fly robot to chat space
    if (this.chatArea) {
      this.chatArea.classList.add("has-messages");
    }
    if (this.robot) {
      this.robot.setMode('chat');
    }

    this.chat.addMessage("user", text);
    this.input.disable();

    // Brief happy flash before thinking
    this.robot.setState("happy");
    var self2 = this;
    setTimeout(function () {
      self2.robot.setState("thinking");
      self2.chat.showTyping();
    }, 400);

    var streamingMsg = null;

    window.AIService.sendMessage(text, function (chunk, fullText) {
      if (!streamingMsg) {
        self.chat.removeTyping();
        self.robot.setState("responding");
        streamingMsg = self.chat.createStreamingMessage();
      }
      streamingMsg.update(fullText);
    })
      .then(function (finalResponse) {
        self.chat.removeTyping();
        if (!streamingMsg) {
          self.robot.setState("responding");
          self.chat.addMessage("assistant", finalResponse);
        } else {
          streamingMsg.finalize(finalResponse);
        }

        // Voice speech synthesis
        if (window.VoiceService && window.VoiceService.enabled) {
          if (voiceToggleBtn) voiceToggleBtn.classList.add("is-speaking");
          self.robot.setState("responding");
          window.VoiceService.speak(
            finalResponse,
            function onStart() {
              self.robot.setState("responding");
            },
            function onEnd() {
              self.robot.setState("idle");
              if (voiceToggleBtn) voiceToggleBtn.classList.remove("is-speaking");
            }
          );
        } else {
          if (window.VoiceService) window.VoiceService.playSuccess();
          setTimeout(function () {
            self.robot.setState("idle");
          }, 1500);
        }
      })
      .catch(function (error) {
        self.chat.removeTyping();
        self.robot.setState("idle");
        self.chat.addMessage("error", "⚠ " + error.message);
        console.error("[App] Error:", error);
      })
      .finally(function () {
        self.input.enable();
      });
  };

  App.prototype._newChat = function () {
    var self = this;
    var messages = document.getElementById("messagesContainer");

    // 1. Refresh & reset voice speech synthesizer immediately
    if (window.VoiceService) {
      window.VoiceService.refresh();
      window.VoiceService.playSuccess();
    }

    // 2. Return robot & UI to initial hero welcome state
    if (this.chatArea) {
      this.chatArea.classList.remove("has-messages");
    }
    if (this.robot) {
      this.robot.setMode('hero');
      this.robot.setState("happy");
      this.robot.waveHello();
    }

    if (messages) {
      messages.style.opacity = "0";
      messages.style.transform = "translateY(10px)";
      setTimeout(function () {
        messages.innerHTML = "";
        window.AIService.resetConversation();
        messages.style.opacity = "";
        messages.style.transform = "";
        self._startHeroPhraseRotation();
        self.input.enable();
      }, 300);
    }
  };

  /* ── Hero Phrase Rotation ─────────────────────────────────── */
  App.prototype._startHeroPhraseRotation = function () {
    var self = this;
    var titleEl = document.querySelector(".hero-welcome-title");
    if (!titleEl) return;
    this._phraseTimer = setInterval(function () {
      self._phraseIndex = (self._phraseIndex + 1) % HERO_PHRASES.length;
      // Animate out
      titleEl.classList.add("phrase-exit");
      setTimeout(function () {
        titleEl.textContent = HERO_PHRASES[self._phraseIndex];
        titleEl.classList.remove("phrase-exit");
        titleEl.classList.add("phrase-enter");
        setTimeout(function () {
          titleEl.classList.remove("phrase-enter");
        }, 500);
      }, 300);
    }, 3500);
  };

  App.prototype._stopHeroPhraseRotation = function () {
    if (this._phraseTimer) {
      clearInterval(this._phraseTimer);
      this._phraseTimer = null;
    }
  };

  App.prototype._initParticles = function () {
    var canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var particles = [];

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 5,
        r: Math.random() * 1.8 + 0.4,
        opacity: Math.random() * 0.4 + 0.05,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,122,0," + p.opacity + ")";
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.0008;
        if (p.y < -10 || p.opacity <= 0) particles[i] = createParticle();
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();

    for (var i = 0; i < 45; i++) {
      var p = createParticle();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    draw();
  };

  App.prototype._initQrCode = function () {
    var qrToggleBtn = document.getElementById("qrToggleBtn");
    var qrPanel = document.getElementById("qrPanel");
    var qrCloseBtn = document.getElementById("qrCloseBtn");
    var qrCanvasWrap = document.getElementById("qrCanvasWrap");
    var qrUrl = document.getElementById("qrUrl");
    var qrNote = document.getElementById("qrNote");

    if (!qrToggleBtn || !qrPanel) return;

    var pageUrl = window.location.href;
    if (qrUrl) qrUrl.textContent = pageUrl;

    var isFileProtocol = window.location.protocol === 'file:';
    var isLocalhost = ['localhost', '127.0.0.1'].indexOf(window.location.hostname) !== -1;

    if (isFileProtocol) {
      if (qrCanvasWrap) {
        qrCanvasWrap.innerHTML =
          '<div style="color:#FF7A00;font-family:monospace;font-size:12px;padding:16px 10px;line-height:1.5;text-align:center;">' +
          '<strong>Running as local file.</strong><br>' +
          'Run <code style="background:#222;color:#fff;padding:2px 5px;border-radius:3px;">python server.py</code> ' +
          'to share on WiFi.' +
          '</div>';
      }
      if (qrNote) qrNote.textContent = 'Launch server.py to scan and chat from your phone.';
      if (qrUrl) qrUrl.textContent = '';
    } else if (typeof window.qrcode === 'function') {
      try {
        var qr = window.qrcode(0, 'M');
        qr.addData(pageUrl);
        qr.make();
        if (qrCanvasWrap) {
          qrCanvasWrap.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4 });
        }
        if (isLocalhost) {
          if (qrNote) {
            qrNote.textContent = 'Notice: This URL uses "localhost". For mobile phones to connect, open the LAN IP printed in your terminal (e.g. http://192.168.x.x:8000).';
          }
        } else {
          if (qrNote) {
            qrNote.textContent = 'Scan with your phone\'s camera to chat with CS-BOT on mobile.';
          }
        }
      } catch (err) {
        console.error('[QR Code Error]:', err);
        if (qrCanvasWrap) {
          qrCanvasWrap.innerHTML = '<div style="color:#ff4444;padding:12px;">QR generation error</div>';
        }
      }
    }

    qrToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      qrPanel.classList.toggle("show");
    });

    if (qrCloseBtn) {
      qrCloseBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        qrPanel.classList.remove("show");
      });
    }

    document.addEventListener("click", function (e) {
      if (qrPanel.classList.contains("show")) {
        if (!qrPanel.contains(e.target) && !qrToggleBtn.contains(e.target)) {
          qrPanel.classList.remove("show");
        }
      }
    });
  };

  // Launch on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    window._ariaApp = new App();
  });

})();
