const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--mute-audio'
        ]
    }
});

let isClientReady = false;
let latestQrImage = null; // Store the latest QR for instant load

client.on('qr', async (qr) => {
    console.log('QR RECEIVED');
    try {
        latestQrImage = await qrcode.toDataURL(qr);
        io.emit('qr', latestQrImage);
    } catch (err) {
        console.error('Failed to generate QR code', err);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    isClientReady = true;
    latestQrImage = null; // Clear QR when ready
    io.emit('ready', 'Client is ready!');
});

client.on('authenticated', () => {
    console.log('Client is authenticated');
    latestQrImage = null;
    io.emit('authenticated', 'Client is authenticated!');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
    io.emit('auth_failure', 'Authentication failure');
});

client.on('disconnected', async (reason) => {
    console.log('Client was disconnected', reason);
    isClientReady = false;
    latestQrImage = null;
    io.emit('disconnected', 'Client disconnected');
    try {
        await client.destroy();
    } catch (err) { /* ignore */ }
    client.initialize();
});

client.initialize();

io.on('connection', (socket) => {
    console.log('A user connected via socket');
    if (isClientReady) {
        socket.emit('ready', 'Client is already ready!');
    } else if (latestQrImage) {
        // Serve QR code INSTANTLY if it's already generated but client isn't ready
        socket.emit('qr', latestQrImage);
    }
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.post('/api/logout', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ success: false, error: 'Client not ready' });
    }
    try {
        await client.logout();
        isClientReady = false;
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/send', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ success: false, error: 'WhatsApp client is not ready. Please scan the QR code.' });
    }

    const { numbers, message } = req.body;
    
    if (!numbers || !message || !Array.isArray(numbers)) {
        return res.status(400).json({ success: false, error: 'Invalid input. Provide an array of numbers and a message.' });
    }

    const results = [];
    
    for (const number of numbers) {
        try {
            // Remove spaces, dashes, or other non-numeric characters (keep '+' if present)
            let formattedNumber = number.replace(/[^\d+]/g, '');
            
            // Remove leading zero if present
            if (formattedNumber.startsWith('0')) {
                formattedNumber = formattedNumber.substring(1);
            }
            
            // Normalize to start with 91 (WhatsApp format doesn't need '+')
            if (formattedNumber.length === 10) {
                formattedNumber = '91' + formattedNumber;
            } else if (formattedNumber.startsWith('+91')) {
                formattedNumber = formattedNumber.substring(1); // remove '+'
            } else if (formattedNumber.startsWith('91') && formattedNumber.length === 12) {
                // already in correct 91XXXXXXXXXX format
            } else {
                 console.warn(`Number ${number} might not be a valid Indian number, sending as is: ${formattedNumber}`);
            }
            
            // Ensure no '+' remains for whatsapp-web.js getNumberId
            formattedNumber = formattedNumber.replace('+', '');
            
            // Small delay to prevent network flood while keeping it fast
            await new Promise(resolve => setTimeout(resolve, 200));
            
            let chatId = formattedNumber + '@c.us';
            try {
                // Resolve the exact WhatsApp ID
                const numberDetails = await client.getNumberId(formattedNumber);
                if (numberDetails) {
                    chatId = numberDetails._serialized;
                } else {
                    throw new Error('Not registered on WhatsApp');
                }
            } catch (idErr) {
                console.warn(`ID Check Failed for ${formattedNumber}:`, idErr.message || idErr);
                // We fallback to standard @c.us if getNumberId fails
            }
            
            await client.sendMessage(chatId, message);
            results.push({ number: formattedNumber, status: 'success' });
            io.emit('send_progress', { number: formattedNumber, status: 'success' });
        } catch (error) {
            console.error(`Failed to send message to ${number}:`, error);
            const errStr = error && error.message ? error.message : String(error);
            results.push({ number, status: 'failed', error: errStr });
            io.emit('send_progress', { number, status: 'failed', error: errStr });
        }
    }
    
    res.json({ success: true, results });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
