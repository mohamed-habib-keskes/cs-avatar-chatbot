# 🤖 CS Avatar Chatbot

An interactive AI-powered chatbot featuring a **3D animated robot assistant** with dynamic movements, facial expressions, voice interaction, and intelligent conversational capabilities.

This project was initially based on an existing frontend concept and was significantly extended with a custom backend architecture, improved LLM integration, intelligent response handling, and additional interactive features.

## ✨ Features

* 🤖 Interactive 3D animated robot assistant
* 💬 AI-powered conversational chatbot
* 🧠 Advanced LLM integration using Groq
* ⚡ Python backend for secure API communication
* 🎭 Dynamic facial expressions and robot reactions
* 💭 Thinking animation while processing responses
* 🗨️ Animated speech bubbles synchronized with conversations
* 🔊 Voice interaction capabilities
* 👀 Natural robot movements and interactions
* 🔄 Head-to-full-body transformation animation
* 📱 QR code connectivity for mobile devices
* 🌐 Local network access for multiple users
* 🛡️ Secure API key handling through the backend
* 👨‍💼 Admin fallback system for unanswered questions
* 🎨 Modern futuristic interface
* 📱 Responsive design for desktop and mobile

## 🛠️ Technologies

### Frontend

* HTML5
* CSS3
* JavaScript
* Three.js / 3D Animation

### Backend

* Python
* HTTP Server
* REST API Architecture

### Artificial Intelligence

* Groq API
* Large Language Models (LLMs)
* Intelligent response routing

## 📂 Project Structure

```text
CS-ChatBot/
│
├── index.html              # Main chatbot interface
├── admin.html              # Admin interface
├── server.py               # Python backend server
│
├── js/
│   ├── app.js              # Main application logic
│   ├── chat.js             # Chat functionality
│   ├── aiService.js        # AI / LLM integration
│   ├── robot.js            # Robot animations
│   ├── voice.js            # Voice interaction
│   ├── input.js            # User input handling
│   └── message.js          # Message rendering
│
├── css/
│   └── styles.css
│
├── assets/
│   └── cs.png
│
├── canned_qa.json          # Predefined questions and answers
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure Python is installed on your system.

You will also need a Groq API key.

### 1. Clone the Repository

```bash
git clone https://github.com/mohamed-habib-keskes/cs-avatar-chatbot.git
cd cs-avatar-chatbot
```

### 2. Start the Backend Server

Run:

```bash
python server.py
```

The backend server handles communication between the frontend and the LLM API.

### 3. Open the Application

Once the server starts, open:

```text
http://localhost:8000/index.html
```

### 📱 Mobile Access

The application can also be accessed from a mobile phone connected to the same WiFi network.

Use the integrated QR code feature to quickly connect a mobile device to the chatbot.

## 🧠 How It Works

The chatbot follows an intelligent response flow:

```text
User
  ↓
3D Chatbot Interface
  ↓
Python Backend
  ↓
LLM Processing
  ↓
Intelligent Response
  ↓
Robot Animation + Speech Bubble
```

When the AI is processing a request, the robot displays dynamic thinking animations. Once a response is generated, the robot reacts and displays the answer through the interactive interface.

## 👨‍💼 Admin Fallback System

If the chatbot cannot provide an appropriate answer, the request can be redirected to an administrator.

This allows the system to combine:

* 🤖 Automated AI responses
* 👨‍💼 Human assistance when necessary

## 🔐 Security

API keys should **never be exposed directly in frontend code or committed to GitHub**.

For production usage, sensitive credentials should be stored using environment variables:

```text
.env
```

Make sure to add sensitive files to `.gitignore`:

```gitignore
.env
__pycache__/
*.pyc
```

## 🎮 Interaction

Users can interact directly with the animated robot.

The robot can:

* Change facial expressions
* Display thinking animations
* React while speaking
* Transform between different visual states
* Respond dynamically to user interactions

## 🚧 Future Improvements

* [ ] Conversation memory
* [ ] RAG integration with custom knowledge bases
* [ ] Multiple language support
* [ ] Improved voice recognition
* [ ] Text-to-speech synchronization
* [ ] User authentication
* [ ] Cloud deployment
* [ ] Analytics dashboard
* [ ] Advanced admin dashboard

## 🙏 Credits

The project was initially inspired by and built upon an existing frontend implementation. The system was further developed and extended with additional backend functionality, AI integration, security improvements, intelligent response handling, and interactive features.

## 👨‍💻 Developer

**Mohamed Habib Keskes**

Computer Science Engineering Student at ENIS

Passionate about **Artificial Intelligence, Cybersecurity, Cloud Computing, and Intelligent Systems**.
