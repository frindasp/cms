import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('send_message', async (data) => {
    const { content, senderId, senderName } = data;
    try {
      // Create message in DB
      const message = await prisma.message.create({
        data: {
          content,
          senderId,
        },
      });

      // Broadcast message to all clients
      io.emit('receive_message', {
        ...message,
        sender: { name: senderName }
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3027;
httpServer.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
