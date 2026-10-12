import { Server } from 'socket.io';
import { userForToken } from './auth.js';

const MAX_MESSAGE_LENGTH = 1000;
const MIN_MS_BETWEEN_MESSAGES = 750;

// Real-time community chat. Clients authenticate with their session token,
// join a channel room, and receive every new message posted to it.
export function attachChat(httpServer, db) {
  const io = new Server(httpServer);

  io.use((socket, next) => {
    const user = userForToken(db, socket.handshake.auth?.token);
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    socket.data.lastMessageAt = 0;
    next();
  });

  const channelBySlug = db.prepare('SELECT id, slug FROM channels WHERE slug = ?');
  const insertMessage = db.prepare('INSERT INTO messages (channel_id, user_id, body) VALUES (?, ?, ?)');
  const messageById = db.prepare(
    `SELECT m.id, m.body, m.created_at AS createdAt, u.username
     FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?`,
  );

  const room = (slug) => `channel:${slug}`;
  const broadcastPresence = (slug) => {
    const online = io.sockets.adapter.rooms.get(room(slug))?.size ?? 0;
    io.to(room(slug)).emit('presence', { channel: slug, online });
  };

  io.on('connection', (socket) => {
    socket.on('join', (slug, ack) => {
      const channel = channelBySlug.get(String(slug));
      if (!channel) return ack?.({ error: 'Channel not found.' });
      // Each socket is in one channel at a time.
      if (socket.data.channel && socket.data.channel !== channel.slug) {
        const previous = socket.data.channel;
        socket.leave(room(previous));
        broadcastPresence(previous);
      }
      socket.data.channel = channel.slug;
      socket.join(room(channel.slug));
      broadcastPresence(channel.slug);
      ack?.({ ok: true });
    });

    socket.on('message', (payload, ack) => {
      const slug = socket.data.channel;
      const channel = slug && channelBySlug.get(slug);
      if (!channel) return ack?.({ error: 'Join a channel first.' });

      const body = String(payload?.body ?? '').trim();
      if (!body) return ack?.({ error: 'Message is empty.' });
      if (body.length > MAX_MESSAGE_LENGTH) return ack?.({ error: `Keep it under ${MAX_MESSAGE_LENGTH} characters.` });

      const now = Date.now();
      if (now - socket.data.lastMessageAt < MIN_MS_BETWEEN_MESSAGES) return ack?.({ error: 'Slow down a little.' });
      socket.data.lastMessageAt = now;

      const { lastInsertRowid } = insertMessage.run(channel.id, socket.data.user.id, body);
      io.to(room(slug)).emit('message', { channel: slug, ...messageById.get(lastInsertRowid) });
      ack?.({ ok: true });
    });

    socket.on('typing', () => {
      if (socket.data.channel) {
        socket.to(room(socket.data.channel)).emit('typing', { username: socket.data.user.username });
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.channel) broadcastPresence(socket.data.channel);
    });
  });

  return io;
}
