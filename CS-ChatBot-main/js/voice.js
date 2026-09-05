/**
 * ============================================================
 *  VOICE SERVICE — Text-to-Speech & Futuristic Robot Sound Synthesizer
 *  - Native Web Speech API (speechSynthesis)
 *  - Real-time synchronization with 3D Robot mouth equalizer
 *  - Web Audio API synthesized droid sound effects
 * ============================================================
 */
(function () {
  'use strict';

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;

  function getAudioContext() {
    if (!audioCtx && AudioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Strip markdown and URLs for clean speech synthesis
  function cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_~>│─━═\-\+]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // All speech synthesis is strictly in English
  function detectLanguage() {
    return 'en-US';
  }

  function VoiceService() {
    this.enabled = localStorage.getItem('csbot_voice_enabled') === 'true';
    this.isSpeaking = false;
    this._currentUtterance = null;
    this._voices = [];
    this._loadVoices();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = this._loadVoices.bind(this);
    }
  }

  VoiceService.prototype._loadVoices = function () {
    if ('speechSynthesis' in window) {
      this._voices = window.speechSynthesis.getVoices() || [];
    }
  };

  VoiceService.prototype._getBestVoice = function () {
    if (!this._voices.length) this._loadVoices();

    // Prioritize high-quality natural English voices
    for (var i = 0; i < this._voices.length; i++) {
      var v = this._voices[i];
      if (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google US English') || v.name.includes('Neural') || v.name.includes('Samantha') || v.name.includes('Guy') || v.name.includes('Jenny') || v.name.includes('David'))) {
        return v;
      }
    }
    // Fallback to any English voice
    for (var j = 0; j < this._voices.length; j++) {
      if (this._voices[j].lang.startsWith('en')) return this._voices[j];
    }
    return null;
  };

  /**
   * Speak a text string aloud using Web Speech API (English only)
   */
  VoiceService.prototype.speak = function (text, onStart, onEnd) {
    if (!('speechSynthesis' in window)) return;
    this.stop();

    var clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return;
    }

    var lang = 'en-US';
    var utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.02;

    var voice = this._getBestVoice();
    if (voice) utterance.voice = voice;

    var self = this;
    utterance.onstart = function () {
      self.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = function () {
      self.isSpeaking = false;
      self._currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = function () {
      self.isSpeaking = false;
      self._currentUtterance = null;
      if (onEnd) onEnd();
    };

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  };

  /**
   * Stop currently playing speech
   */
  VoiceService.prototype.stop = function () {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this._currentUtterance = null;
  };

  /**
   * Refresh and completely reset voice synthesizer
   */
  VoiceService.prototype.refresh = function () {
    this.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this._loadVoices();
    }
    this.isSpeaking = false;
    this._currentUtterance = null;
  };

  /**
   * Toggle global voice narration
   */
  VoiceService.prototype.toggle = function () {
    this.enabled = !this.enabled;
    localStorage.setItem('csbot_voice_enabled', this.enabled ? 'true' : 'false');
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  };

  /* ── Web Audio API Synthesizer (Futuristic Droid SFX) ────── */
  VoiceService.prototype.playChirp = function () {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  VoiceService.prototype.playPoke = function () {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  };

  VoiceService.prototype.playSuccess = function () {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;

      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.04, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
      });
    } catch (e) {}
  };

  window.VoiceService = new VoiceService();

})();
