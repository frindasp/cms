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

  socket.on('user_online', async (userId) => {
    socket.userId = userId;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });
      io.emit('user_status_change', { userId, isOnline: true });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  socket.on('send_message', async (data) => {
    const { content, senderId, senderName, conversationId, isAdmin } = data;
    try {
      // Create message in DB
      const message = await prisma.message.create({
        data: {
          content,
          senderId,
          conversationId,
          isAdmin: isAdmin || false,
          status: 'SENT',
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

  socket.on('typing', (data) => {
    // data: { userId, userName, conversationId }
    socket.broadcast.emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.broadcast.emit('user_stop_typing', data);
  });

  socket.on('mark_delivered', async (messageId) => {
    try {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { status: 'DELIVERED' },
      });
      io.emit('message_status_update', { messageId, status: 'DELIVERED', conversationId: message.conversationId });
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  });

  socket.on('mark_read', async (data) => {
    const { messageId, conversationId } = data;
    try {
      if (messageId) {
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'READ', isRead: true },
        });
        io.emit('message_status_update', { messageId, status: 'READ', conversationId });
      } else if (conversationId) {
        // Mark all messages in conversation as read
        await prisma.message.updateMany({
          where: { conversationId, status: { not: 'READ' } },
          data: { status: 'READ', isRead: true },
        });
        io.emit('conversation_read', { conversationId });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      try {
        const lastSeen = new Date();
        await prisma.user.update({
          where: { id: socket.userId },
          data: { isOnline: false, lastSeen },
        });
        io.emit('user_status_change', { userId: socket.userId, isOnline: false, lastSeen });
      } catch (error) {
        console.error('Error updating user disconnect status:', error);
      }
    }
  });
});

const PORT = 3027;
httpServer.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
