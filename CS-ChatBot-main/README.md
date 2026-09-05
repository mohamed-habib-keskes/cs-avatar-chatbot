# 🤖 CS ChatBot

An interactive AI-powered chatbot featuring a **3D animated robot assistant** with dynamic movements, facial expressions, and interactive animations.

## ✨ Features

* 🤖 Interactive 3D robot assistant
* 💬 AI-powered chatbot
* 🎭 Dynamic facial expressions and reactions
* 🔄 Head-to-full-body transformation animation
* 🧠 Thinking animation while processing questions
* 👀 Natural robot movements and interactions
* 🎨 Modern futuristic interface
* 📱 Responsive user interface

## 🛠️ Technologies

* HTML5
* CSS3
* JavaScript
* 3D Animation
* AI / LLM API

## 📂 Project Structure

```text
CS-ChatBot/
├── index.html
├── js/
│   └── aiService.js
├── css/
├── assets/
├── README.md
└── .gitignore
```

## 🚀 Getting Started

### 1. Launch with Python Server (Recommended)

Run the secure local backend server:

```bash
python server.py
```

- When prompted, paste your **Groq API key** (free at [console.groq.com/keys](https://console.groq.com/keys)), or press Enter to run in Admin-only mode.
- The server will automatically detect your WiFi network and print your LAN URL:
  - Open on computer: `http://localhost:8000/index.html`
  - Admin panel: `http://localhost:8000/admin.html`
- Click **📱 SCAN QR** in the top header to let any phone on the same WiFi scan and chat immediately without ever needing an API key!

### 2. Standalone Browser Mode

Open `index.html` directly in your browser. Configure your Google Gemini API key in `index.html` (`window.GEMINI_API_KEY`) if running without `server.py`.

## 🎮 Interaction

Click on the robot to switch between:

**Head → Full Body → Head**

The robot also reacts dynamically to user interactions with different movements and expressions.

## 🔐 Security

API keys and other sensitive credentials should never be committed to the repository. Use environment variables and keep `.env` in `.gitignore`.

## 👨‍💻 Author

**Ahmed Aziz Hssairi**

Computer Science Engineering Student
