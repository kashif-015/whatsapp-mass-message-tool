# WhatsApp Mass Message Tool 🚀

A modern, fast, and secure web application to seamlessly dispatch custom messages to multiple WhatsApp contacts simultaneously. Built with Node.js, Express, Socket.io, and `whatsapp-web.js`.

![UI Preview](public/whatsapp.png) <!-- Replace this with an actual screenshot of the UI -->

## ✨ Features

- **Mass Broadcasting:** Send custom messages to an unlimited array of contacts sequentially.
- **Smart Formatting:** Automatically parses formatting and injects the Indian country code (`+91`) for 10-digit numbers, gracefully handling leading zeros, spaces, and dashes.
- **Instant QR Caching:** Emits the login QR code instantly on page load rather than waiting for the headless browser to fully boot.
- **Anti-Spam Delay:** Configured with a built-in slight delay to drastically reduce the chance of triggering WhatsApp's automated spam filters.
- **Professional UI:** Built with Tailwind CSS and a beautiful, dynamic glassmorphism interface.
- **Active Real-Time Logs:** Uses Socket.io to stream real-time successful deliveries and execution errors straight to your browser.
- **Session Management:** Gracefully login and logout of your linked device securely from the UI.

## 🛠️ Built With

- **Backend:** Node.js, Express, `whatsapp-web.js` (Puppeteer), Socket.IO
- **Frontend:** HTML5, Tailwind CSS, Socket.IO Client

## 🚀 Quick Start

### 1. Requirements
Ensure you have Node.js installed on your machine.

### 2. Installation
Clone the repository and install the required dependencies:

```bash
git clone https://github.com/your-username/whatsapp-mass-message-tool.git
cd whatsapp-mass-message-tool
npm install
```

### 3. Running the Server
Start the application with Node:

```bash
node server.js
```

### 4. Using the App
1. Open your web browser and navigate to `http://localhost:3000`.
2. Grab your phone, open WhatsApp, go to **Linked Devices**, and scan the QR code displayed on the screen.
3. Once the app says **"Session Active"**, enter your comma-separated phone numbers and write your message.
4. Click **"Send Message"** and watch the execution terminal log the deliveries in real time!

## ⚠️ Important Disclaimer
This tool is built for personal, non-commercial use. Sending unsolicited bulk messages or spam can lead to your WhatsApp number being permanently banned by WhatsApp's automated systems. The author takes no responsibility for blocked accounts. Please use responsibly.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
