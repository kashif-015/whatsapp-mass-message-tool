const socket = io();

// UI Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');
const readyContainer = document.getElementById('ready-container');
const sendButton = document.getElementById('send-button');
const notReadyWarning = document.getElementById('not-ready-warning');
const messageForm = document.getElementById('message-form');
const logsContainer = document.getElementById('logs');
const progressSummary = document.getElementById('progress-summary');
const statProcessed = document.getElementById('stat-processed');
const statSuccess = document.getElementById('stat-success');
const logoutButton = document.getElementById('logout-button');

// State
let isReady = false;
let totalToSend = 0;
let sentCount = 0;
let successCount = 0;

function updateStatus(text, colorTheme) {
    statusText.textContent = text;
    // Map themes to tailwind classes for the indicator
    statusIndicator.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-300';
    
    // We will target the spans inside the indicator
    const pingSpan = statusIndicator.children[0].children[0];
    const dotSpan = statusIndicator.children[0].children[1];
    
    if (colorTheme === 'yellow') {
        statusIndicator.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-700');
        pingSpan.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
        dotSpan.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
    } else if (colorTheme === 'blue') {
        statusIndicator.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700');
        pingSpan.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75';
        dotSpan.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500';
    } else if (colorTheme === 'green') {
        statusIndicator.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
        pingSpan.className = 'hidden'; // Stop pinging when ready
        dotSpan.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    } else if (colorTheme === 'red') {
        statusIndicator.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
        pingSpan.className = 'hidden';
        dotSpan.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
    } else {
        statusIndicator.classList.add('bg-slate-100', 'border-slate-200', 'text-slate-500');
        pingSpan.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75';
        dotSpan.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500';
    }
}

function updateStats() {
    statProcessed.textContent = sentCount;
    if (sentCount === 0) {
        statSuccess.textContent = '0%';
    } else {
        const rate = Math.round((successCount / sentCount) * 100);
        statSuccess.textContent = `${rate}%`;
    }
}

function displayLog(message, type = 'info') {
    if (logsContainer.innerHTML.includes('> Waiting for instructions...')) {
        logsContainer.innerHTML = '';
    }
    const logEl = document.createElement('div');
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    
    let colorClass = 'text-slate-400'; // Default default/info
    let icon = 'ℹ️';
    
    if (type === 'success') {
        colorClass = 'text-emerald-400';
        icon = '✓';
    } else if (type === 'error') {
        colorClass = 'text-rose-400';
        icon = '✗';
    } else if (type === 'system') {
        colorClass = 'text-blue-400';
        icon = '⚙';
    }

    logEl.className = `${colorClass} py-0.5 break-all`;
    logEl.innerHTML = `<span class="text-slate-600 opacity-70">[${timeStr}]</span> <span class="mx-1">${icon}</span> ${message}`;
    
    logsContainer.appendChild(logEl);
    
    // Auto-scroll to bottom smoothly
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function setReadyState(ready) {
    isReady = ready;
    if (ready) {
        qrContainer.classList.add('hidden');
        qrContainer.classList.remove('flex');
        qrContainer.style.opacity = 0;
        
        readyContainer.classList.remove('hidden');
        readyContainer.classList.add('flex');
        setTimeout(() => readyContainer.style.opacity = 1, 50);
        
        sendButton.disabled = false;
        notReadyWarning.classList.add('hidden');
        notReadyWarning.classList.remove('inline-flex');
    } else {
        readyContainer.classList.add('hidden');
        readyContainer.classList.remove('flex');
        readyContainer.style.opacity = 0;
        
        sendButton.disabled = true;
        
        notReadyWarning.classList.remove('hidden');
        notReadyWarning.classList.add('inline-flex');
    }
}

// Socket Events
socket.on('qr', (qrSrc) => {
    updateStatus('Waiting for Scan', 'yellow');
    qrImage.src = qrSrc;
    setReadyState(false);
    
    qrContainer.classList.remove('hidden');
    qrContainer.classList.add('flex');
    setTimeout(() => qrContainer.style.opacity = 1, 50);
});

socket.on('authenticated', () => {
    updateStatus('Authenticating...', 'blue');
    qrContainer.style.opacity = 0;
    setTimeout(() => {
        qrContainer.classList.add('hidden');
        qrContainer.classList.remove('flex');
    }, 500);
});

socket.on('ready', () => {
    updateStatus('Online', 'green');
    setReadyState(true);
    displayLog('WhatsApp session linked and ready.', 'system');
});

socket.on('disconnected', () => {
    updateStatus('Disconnected', 'red');
    setReadyState(false);
    displayLog('Session terminated or disconnected from WhatsApp.', 'error');
});

socket.on('send_progress', (data) => {
    sentCount++;
    progressSummary.textContent = `${sentCount}/${totalToSend} Processed`;
    
    if (data.status === 'success') {
        successCount++;
        displayLog(`Sent delivery to ${data.number}`, 'success');
    } else {
        displayLog(`Failed targeting ${data.number}: ${data.error}`, 'error');
    }
    
    updateStats();
    
    if (sentCount === totalToSend) {
        sendButton.disabled = false;
        sendButton.querySelector('span').textContent = 'Dispatch Broadcast';
        displayLog('Broadcast sequence completed.', 'system');
        progressSummary.textContent = 'COMPLETED';
        progressSummary.className = 'text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded';
    }
});

// Form Submission
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isReady) return;

    const rawNumbers = document.getElementById('numbers').value;
    const message = document.getElementById('message').value;

    const numbersList = rawNumbers.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    if (numbersList.length === 0 || !message) {
        alert('Please enter valid recipients and a payload message.');
        return;
    }

    // Reset UI for new batch
    sendButton.disabled = true;
    sendButton.querySelector('span').textContent = 'Executing...';
    logsContainer.innerHTML = '';
    
    totalToSend = numbersList.length;
    sentCount = 0;
    successCount = 0;
    updateStats();
    
    progressSummary.textContent = `0/${totalToSend} Executing`;
    progressSummary.className = 'text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 animate-pulse rounded';
    
    displayLog(`Initializing broadcast to ${totalToSend} recipients...`, 'system');

    try {
        const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numbers: numbersList,
                message: message
            })
        });

        const data = await response.json();
        if (!data.success) {
            displayLog(`Server Error: ${data.error}`, 'error');
            sendButton.disabled = false;
            sendButton.querySelector('span').textContent = 'Dispatch Broadcast';
        }
    } catch (err) {
        displayLog(`Network Error: ${err.message}`, 'error');
        sendButton.disabled = false;
        sendButton.querySelector('span').textContent = 'Dispatch Broadcast';
    }
});

// Logout Feature
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to terminate this WhatsApp session?')) return;
        
        logoutButton.innerHTML = '<span class="animate-pulse">Terminating...</span>';
        logoutButton.disabled = true;
        
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            const data = await response.json();
            if (!data.success) {
                alert('Termination failed: ' + data.error);
                logoutButton.innerHTML = 'Terminate Session';
                logoutButton.disabled = false;
            }
        } catch (err) {
            alert('Request error: ' + err.message);
            logoutButton.innerHTML = 'Terminate Session';
            logoutButton.disabled = false;
        }
    });
}
