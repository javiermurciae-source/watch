const express = require('express');
const app = express();
app.set('trust proxy', true); // Necesario para Cloudflare Tunnel

const fs = require('fs');
const http = require('http'); // Cambiado de https a http
const path = require('path');
const os = require('os');

// Obtener IPs locales para mostrar en consola
function getIP() {
    const interfaces = os.networkInterfaces();
    let localIP = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
            }
        }
    }
    return localIP;
}

// Crear Servidor HTTP (Cloudflare Tunnel provee el HTTPS afuera)
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});


const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, { 
    debug: true, 
    path: '/',
    allow_discovery: true,
    proxied: true 
});

app.use('/peerjs', peerServer);
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.static(path.join(__dirname)));

let connectedUsers = {};
let screenShareAdmin = null;

io.on('connection', (socket) => {
    socket.on('join-room', (username, avatar, peerId) => {
        socket.username = username;
        socket.avatar = avatar;
        socket.peerId = peerId;
        connectedUsers[socket.id] = { username, avatar, peerId };

        socket.emit('all-users', {
            users: Object.values(connectedUsers),
            adminName: screenShareAdmin ? (connectedUsers[screenShareAdmin]?.username || null) : null
        });
        socket.broadcast.emit('user-connected', { username, avatar, peerId });
    });

    socket.on('send-chat', (msg) => {
        io.emit('new-chat', { username: socket.username, avatar: socket.avatar, peerId: socket.peerId, msg });
    });

    socket.on('typing', () => {
        socket.broadcast.emit('user-typing', { username: socket.username });
    });

    socket.on('stop-typing', () => {
        socket.broadcast.emit('user-stop-typing', { username: socket.username });
    });

    socket.on('video-sync', (data) => {
        socket.broadcast.emit('video-sync-client', data);
    });

    socket.on('request-screenshare', (callback) => {
        if (!screenShareAdmin) {
            screenShareAdmin = socket.id;
            io.emit('system-message', `${socket.username} ha comenzado a compartir.`);
            callback({ allowed: true });
        } else if (screenShareAdmin === socket.id) {
            callback({ allowed: true });
        } else {
            const adminName = connectedUsers[screenShareAdmin] ? connectedUsers[screenShareAdmin].username : 'Alguien';
            callback({ allowed: false, adminName });
        }
    });

    socket.on('stop-screenshare', () => {
        if (screenShareAdmin === socket.id) {
            screenShareAdmin = null;
            io.emit('system-message', `${socket.username} dejó de compartir.`);
        }
    });

    socket.on('reaction', (emoji) => {
        socket.broadcast.emit('reaction', emoji);
    });

    socket.on('update-profile', (newName, newAvatar) => {
        if (connectedUsers[socket.id]) {
            connectedUsers[socket.id].username = newName;
            connectedUsers[socket.id].avatar = newAvatar;
            socket.username = newName;
            socket.avatar = newAvatar;
            
            socket.broadcast.emit('user-profile-updated', {
                peerId: socket.peerId,
                username: newName,
                avatar: newAvatar
            });
        }
    });

    socket.on('toggle-cam', (isEnabled) => {
        const peerId = connectedUsers[socket.id]?.peerId;
        if (peerId) {
            io.emit('cam-toggled', peerId, isEnabled, socket.username);
        }
    });

    socket.on('toggle-mic', (isEnabled) => {
        const peerId = connectedUsers[socket.id]?.peerId;
        if (peerId) {
            io.emit('mic-toggled', peerId, isEnabled, socket.username);
        }
    });

    socket.on('disconnect', () => {
        if (screenShareAdmin === socket.id) {
            screenShareAdmin = null;
            io.emit('system-message', `El moderador (${socket.username}) se desconectó.`);
        }
        const peerId = connectedUsers[socket.id]?.peerId;
        delete connectedUsers[socket.id];
        if (peerId) {
            io.emit('user-disconnected', peerId);
        }
    });
});

app.get('/api/stickers', (req, res) => {
    const stickersDir = path.join(__dirname, 'sticker');
    if (!fs.existsSync(stickersDir)) return res.json([]);
    const packs = [];
    fs.readdirSync(stickersDir).forEach(pack => {
        const packPath = path.join(stickersDir, pack);
        if (fs.statSync(packPath).isDirectory()) {
            const files = fs.readdirSync(packPath).filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.gif'));
            packs.push({ name: pack, stickers: files.map(f => `/sticker/${encodeURIComponent(pack)}/${encodeURIComponent(f)}`) });
        }
    });
    res.json(packs);
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getIP();
    console.log(`\n======================================================`);
    console.log(`🚀 WatchParty Pro - Versión Cloudflare (Argo/Tunnel)`);
    console.log(`======================================================`);
    console.log(`👉 LOCAL   : http://localhost:${PORT}`);
    console.log(`👉 LAN     : http://${localIP}:${PORT}`);
    console.log(`👉 PUBLICO : Point your Tunnel to http://localhost:3000`);
    console.log(`======================================================\n`);
});



