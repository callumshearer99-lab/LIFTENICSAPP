import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { attachChat } from './chat.js';

const PORT = Number(process.env.PORT) || 3001;
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const db = openDatabase();
const app = createApp(db);

// In production, serve the built React app and let it handle client-side routes.
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const server = createServer(app);
attachChat(server, db);

server.listen(PORT, () => {
  console.log(`Liftenics API listening on http://localhost:${PORT}`);
});
