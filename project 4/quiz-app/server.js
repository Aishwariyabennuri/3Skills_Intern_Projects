const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const quizRoutes = require('./routes/quizzes');
const roomRoutes = require('./routes/rooms');
const attachGameSocket = require('./sockets/gameSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/quizzes', quizRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

attachGameSocket(io);

server.listen(PORT, () => {
  console.log(`QuizUp Live is running: http://localhost:${PORT}`);
});
