const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;
const clients = new Map(); // userId -> Set of WebSocket clients

function initWebSocket(server) {
    wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            if (url.pathname === '/ws') {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request);
                });
            } else {
                socket.destroy();
            }
        } catch (err) {
            console.error('WebSocket Upgrade Error:', err);
            socket.destroy();
        }
    });

    wss.on('connection', (ws, request) => {
        console.log('WebSocket: New client connected');
        let authenticatedUserId = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'register') {
                    const token = data.token;
                    if (token) {
                        try {
                            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                            const userId = decoded.id;
                            if (userId) {
                                authenticatedUserId = userId.toString();
                                if (!clients.has(authenticatedUserId)) {
                                    clients.set(authenticatedUserId, new Set());
                                }
                                clients.get(authenticatedUserId).add(ws);
                                console.log(`WebSocket: Client authenticated for User: ${authenticatedUserId}`);

                                // Confirm registration
                                ws.send(JSON.stringify({
                                    type: 'registered',
                                    success: true
                                }));
                            }
                        } catch (err) {
                            console.error('WebSocket: Authentication token verification failed:', err.message);
                            ws.send(JSON.stringify({ type: 'error', message: 'Authentication expired or invalid.' }));
                        }
                    }
                }
            } catch (err) {
                console.error('WebSocket Message Processing Error:', err);
            }
        });

        ws.on('close', () => {
            console.log('WebSocket: Client disconnected');
            if (authenticatedUserId && clients.has(authenticatedUserId)) {
                clients.get(authenticatedUserId).delete(ws);
                if (clients.get(authenticatedUserId).size === 0) {
                    clients.delete(authenticatedUserId);
                }
            }
        });

        ws.on('error', (err) => {
            console.error('WebSocket connection error:', err);
        });
    });
}

/**
 * Send real-time packet to a specific logged-in user
 */
function sendToUser(userId, data) {
    if (!userId) return;
    const userConnections = clients.get(userId.toString());
    if (userConnections) {
        const payload = JSON.stringify(data);
        userConnections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(payload);
                } catch (err) {
                    console.error(`WebSocket: Error sending to user ${userId}:`, err);
                }
            }
        });
    }
}

/**
 * Broadcast real-time packet to all connected clients
 */
function broadcastToAll(data) {
    if (!wss) return;
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(payload);
            } catch (err) {
                console.error('WebSocket: Error broadcasting message:', err);
            }
        }
    });
}

module.exports = {
    initWebSocket,
    sendToUser,
    broadcastToAll
};
