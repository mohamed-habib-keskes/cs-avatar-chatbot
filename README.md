🤖 BusterDrone (Byte)

An interactive 3D robot viewer with a built-in AI chatbot, local admin takeover, and phone-friendly access — all running on your own machine.

BusterDrone (Byte) is a self-hosted interactive robot experience. Visitors can explore the 3D robot, ask questions through the built-in chatbot, and receive AI-generated answers powered by Groq.

When you want to take control, the built-in Admin Panel lets you manually answer visitor questions in real time.

Everything runs locally on your computer, and your Groq API key never needs to be exposed to visitors.

✨ Features
🤖 Interactive 3D robot viewer
💬 Built-in AI chatbot
🧠 Groq-powered responses
👨‍💻 Admin takeover mode — manually answer visitor questions
🔄 Automatic fallback to admin if an AI request fails
⚡ Canned Q&A responses for frequently asked questions
📱 Phone support via local Wi-Fi
🔐 API key stays on the server
📦 No external Python packages required
🖥️ Simple local setup
📱 QR code panel for quickly opening the viewer on a phone
📁 Project Structure
BusterDrone/
│
├── file1.html      # Visitor-facing 3D viewer + chatbot
├── file2.py        # Local server, Groq proxy & admin backend
├── admin.html      # Admin dashboard
└── README.md       # Project documentation

file1.html

The main visitor experience.

It contains:

3D robot viewer
Chat interface
Robot speech bubble
QR code panel
Canned question/answer system
file2.py

The local Python server that connects everything together.

It:

Serves the HTML files
Handles chat requests
Communicates with Groq
Keeps the API key on your computer
Manages admin hand-off
Handles failed AI requests
admin.html

The administrator dashboard.

It allows you to:

See incoming visitor questions
Put the chatbot into manual mode
Write your own responses
Send responses directly to the visitor
Return the chatbot to automatic AI mode
🛠️ Requirements

You only need:

Python 3
A Groq API key

No additional Python packages are required.

Get a Groq API key from:

{"fallbackMarkdown":"Groq API Keys
","reference":{"matched_text":"","prefix":null,"start_idx":2379,"end_idx":2428,"safe_urls":[],"refs":[],"alt":"Groq API Keys
","prompt_text":"Groq API Keys
","type":"url","title":"Groq API Keys","item":{"title":"Groq API Keys","url":"https://console.groq.com/keys?utm_source=chatgpt.com","attribution":"console.groq.com","pub_date":null,"snippet":null,"attribution_segments":null,"supporting_websites":null,"refs":[],"hue":null,"attributions":null},"layout":null,"logo":null},"showLoginRequiredCard":false}

🚀 Getting Started
1. Download the project

Clone the repository:

git clone https://github.com/YOUR_USERNAME/BusterDrone.git
cd BusterDrone


Or download the project as a ZIP and extract it.

2. Make sure the files are together

All three files should be in the same directory:

BusterDrone/
├── file1.html
├── file2.py
└── admin.html

3. Start the server

Run:

python3 file2.py


On Windows, you may need:

python file2.py


The server will ask for your Groq API key.

Your input is hidden while entering the key.

Using an environment variable

You can also set the API key before starting the server.

Linux/macOS:

export GROQ_API_KEY="your_api_key_here"
python3 file2.py


Windows PowerShell:

$env:GROQ_API_KEY="your_api_key_here"
python file2.py


This skips the API-key prompt.

🌐 Opening BusterDrone

After starting the server, it will print a local URL similar to:

http://192.168.1.23:8000/file1.html


Open this URL on your computer.

You should see the BusterDrone interface.

📱 Use It on a Phone

BusterDrone can also be opened from phones and other devices connected to the same Wi-Fi network.

Simply scan the SCAN ON PHONE QR code inside the viewer.

For example:

Computer
   │
   │  Wi-Fi
   │
   ├───────────────┐
   │               │
Phone           Tablet


The visitor's device does not need your Groq API key.

The browser sends chat requests to your local Python server, and the server communicates with Groq.

⚠️ Important

The phone must be connected to the same local network as the computer running the server.

If you're using:

Mobile data
A guest Wi-Fi network
A VPN
Docker
WSL
A firewall blocking port 8000

the phone may not be able to connect.

👨‍💻 Admin Panel

The server also prints an admin URL, for example:

http://192.168.1.23:8000/admin.html


Open it on your computer.

The admin panel allows you to take over the conversation whenever you want.

🤖 Automatic Mode

When manual mode is disabled:

Visitor
   ↓
BusterDrone
   ↓
Groq AI
   ↓
Answer


Questions are automatically sent to the AI.

👨‍💻 Manual Mode

Enable:

Hold new questions for me instead of sending them to the AI

Now questions are held for you:

Visitor
   ↓
BusterDrone
   ↓
Admin Panel
   ↓
You write the answer
   ↓
Visitor receives your response


Type your response and click Send reply.

Your message will appear in the visitor's chat/speech bubble just like an AI-generated response.

Turn the switch off whenever you want BusterDrone to return to automatic AI responses.

🛡️ AI Failure Fallback

BusterDrone is designed to avoid leaving visitors with a generic error when something goes wrong.

If a Groq request fails, the question can automatically be handed to the admin panel.

This gives you a chance to respond manually instead.

Visitor question
       │
       ▼
    Groq AI
       │
   ┌───┴───┐
   │       │
Success   Error
   │       │
   ▼       ▼
Answer   Admin

💡 Custom Canned Answers

For common questions, you don't always need to call the AI.

file1.html contains a QA_PAIRS list near the beginning of the chat script.

For example:

const QA_PAIRS = [
    {
        question: "what is cstam?",
        answer: "CSTAM is ..."
    },
    {
        question: "who made you?",
        answer: "I was created as part of the BusterDrone project."
    }
];


These answers can be returned immediately without making a request to Groq.

Why use canned answers?

They're useful for:

Frequently asked questions
Project-specific information
Event information
Organization details
Consistent answers
Questions where you don't want AI-generated responses

Add as many entries as you need.

🔐 How the API Key Works

The Groq API key is handled by the Python server rather than being placed inside the visitor's browser.

The basic architecture looks like this:

┌─────────────────────┐
│     Visitor Phone   │
│                     │
│   BusterDrone UI    │
└──────────┬──────────┘
           │
           │ Local Wi-Fi
           ▼
┌─────────────────────┐
│   Python Server     │
│                     │
│  file2.py           │
│                     │
│  GROQ_API_KEY       │
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────┐
│       Groq API      │
└─────────────────────┘


The visitor does not need to know or enter your API key.

Security note: This project is designed for local/network demonstrations. If you expose the server to the public internet, add proper authentication, HTTPS, rate limiting, and other security controls before doing so.

🧪 Troubleshooting
📱 Phone can't connect

Make sure:

Your phone and computer are on the same Wi-Fi network.
The phone isn't using mobile data.
You're not connected to a guest network that isolates devices.
Your computer's firewall allows incoming connections on port 8000.
ERR_ADDRESS_UNREACHABLE

The server attempts to detect your local network address automatically.

Sometimes computers have multiple network interfaces, such as:

VPN
Docker
WSL
Virtual machines
Ethernet
Wi-Fi

If the server detects the wrong address, it may print alternative addresses.

Try one of the other local network addresses shown by the server.

💬 Chat isn't working

Try:

Stop the server.
Start it again.
Check that your Groq API key is valid.
Make sure the computer has internet access.
Check the terminal for error messages.

You can also temporarily test one of the canned QA_PAIRS questions to confirm that the local chat interface itself is working.

🔑 Groq API key problems

If you are prompted for a key, make sure you entered a valid Groq API key.

Alternatively, use the GROQ_API_KEY environment variable.

Never commit your API key to GitHub.

Do not put your actual API key inside file1.html, admin.html, or the repository.

🏗️ Architecture

BusterDrone is intentionally simple:

                 ┌──────────────────┐
                 │     Visitor      │
                 │  file1.html      │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    file2.py      │
                 │   Local Server   │
                 └───────┬───┬──────┘
                         │   │
              ┌──────────┘   └──────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  Groq API   │           │  admin.html │
       │  AI Answer  │           │    Admin    │
       └─────────────┘           └─────────────┘


This keeps the project lightweight while still allowing both AI-powered and human-powered conversations.

🎯 Use Cases

BusterDrone can be used for:

🏫 School and university demonstrations
🤖 Robotics exhibitions
🧪 AI demonstrations
🎪 Events and exhibitions
🏢 Interactive installations
🧑‍💻 Hackathons
🎓 Student projects
🖥️ Local AI experiments
🔮 Possible Future Improvements

Some ideas for future versions:

 Admin authentication
 Conversation history
 Multiple visitor sessions
 Visitor queue management
 Voice input
 Text-to-speech responses
 More 3D robot animations
 Custom AI personalities
 Configurable Groq models
 Persistent Q&A storage
 Analytics dashboard
 Better mobile UI
 HTTPS support
 Public deployment support
🤝 Contributing

Contributions, ideas, and improvements are welcome.

If you find a bug or have an idea for a new feature, feel free to open an issue or submit a pull request.

📄 License

Add your preferred license here, for example:

MIT License


If you use a different license, replace the section above with the appropriate license information.

⭐ Support the Project

If you find BusterDrone useful or interesting, consider giving the repository a ⭐ on GitHub.

Have fun building with Byte! 🤖
