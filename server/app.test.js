import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { io as connect } from 'socket.io-client';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { attachChat } from './chat.js';

let server;
let chat;
let base;

before(async () => {
  const db = openDatabase(':memory:');
  server = createServer(createApp(db));
  chat = attachChat(server, db);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => chat.close());

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const register = (username) =>
  call('/auth/register', { method: 'POST', body: { username, password: 'password123' } }).then((r) => r.data);

test('first user is admin, later users are not', async () => {
  const first = await register('coach');
  const second = await register('athlete');
  assert.equal(first.user.isAdmin, 1);
  assert.equal(second.user.isAdmin, 0);
});

test('rejects bad registrations and wrong passwords', async () => {
  assert.equal((await call('/auth/register', { method: 'POST', body: { username: 'x', password: 'password123' } })).status, 400);
  assert.equal((await call('/auth/register', { method: 'POST', body: { username: 'coach', password: 'password123' } })).status, 409);
  assert.equal((await call('/auth/login', { method: 'POST', body: { username: 'coach', password: 'nope-nope' } })).status, 401);
  assert.equal((await call('/auth/login', { method: 'POST', body: { username: 'coach', password: 'password123' } })).status, 200);
});

test('lists and filters exercises, shows progressions', async () => {
  const all = await call('/exercises');
  assert.ok(all.data.exercises.length >= 20);
  const pull = await call('/exercises?category=pull');
  assert.ok(pull.data.exercises.every((e) => e.category === 'pull'));
  const detail = await call('/exercises/pull-up');
  assert.equal(detail.data.easier.slug, 'negative-pull-up');
  assert.ok(detail.data.harder.some((h) => h.slug === 'muscle-up'));
});

test('only admins can set a form video, and only http(s) URLs', async () => {
  const { token: admin } = (await call('/auth/login', { method: 'POST', body: { username: 'coach', password: 'password123' } })).data;
  const { token: member } = (await call('/auth/login', { method: 'POST', body: { username: 'athlete', password: 'password123' } })).data;
  const url = 'https://www.youtube.com/watch?v=abc123';
  assert.equal((await call('/exercises/push-up/video', { method: 'PUT', token: member, body: { videoUrl: url } })).status, 403);
  assert.equal((await call('/exercises/push-up/video', { method: 'PUT', token: admin, body: { videoUrl: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await call('/exercises/push-up/video', { method: 'PUT', token: admin, body: { videoUrl: url } })).status, 200);
  assert.equal((await call('/exercises/push-up')).data.exercise.videoUrl, url);
});

test('start a plan, log workouts, and the next session advances', async () => {
  const { token } = await register('lifter1');
  assert.equal((await call('/me', { token })).data.activePlan, null);
  assert.equal((await call('/me/workouts', { method: 'POST', token, body: { dayIndex: 0 } })).status, 400);

  await call('/plans/beginner-foundations/start', { method: 'POST', token });
  let me = (await call('/me', { token })).data;
  assert.equal(me.activePlan.slug, 'beginner-foundations');
  assert.equal(me.activePlan.nextDayIndex, 0);
  assert.equal(me.activePlan.days[0].exercises[0].name, 'Incline Push-up');

  await call('/me/workouts', { method: 'POST', token, body: { dayIndex: 0, notes: 'felt good' } });
  me = (await call('/me', { token })).data;
  assert.equal(me.activePlan.nextDayIndex, 1);
  assert.equal(me.activePlan.completedSessions, 1);
  assert.equal(me.stats.totalWorkouts, 1);
  assert.equal(me.recentWorkouts[0].notes, 'felt good');

  assert.equal((await call('/me/workouts', { method: 'POST', token, body: { dayIndex: 99 } })).status, 400);
});

test('users can build custom plans from library exercises', async () => {
  const { token } = await register('builder');
  const bad = await call('/plans', { method: 'POST', token, body: { name: 'X', level: 'beginner', days: [{ exercises: [{ slug: 'nope' }] }] } });
  assert.equal(bad.status, 400);

  const res = await call('/plans', {
    method: 'POST',
    token,
    body: { name: 'My Push Day', level: 'intermediate', weeks: 4, days: [{ name: 'Push', exercises: [{ slug: 'dip', sets: 4, reps: '8', rest: 120 }] }] },
  });
  assert.equal(res.status, 201);
  const plan = (await call(`/plans/${res.data.slug}`)).data.plan;
  assert.equal(plan.author, 'builder');
  assert.equal(plan.days[0].exercises[0].name, 'Parallel Bar Dip');
});

test('chat: messages are broadcast to the channel and saved', async () => {
  const a = await register('chatter_a');
  const b = await register('chatter_b');
  assert.equal((await call('/channels/general/messages')).status, 401);

  const sockA = connect(base, { auth: { token: a.token } });
  const sockB = connect(base, { auth: { token: b.token } });
  const join = (s) => new Promise((resolve) => s.emit('join', 'general', resolve));
  await Promise.all([join(sockA), join(sockB)]);

  const received = new Promise((resolve) => sockB.on('message', resolve));
  const ack = await new Promise((resolve) => sockA.emit('message', { body: 'Just hit my first muscle-up!' }, resolve));
  assert.deepEqual(ack, { ok: true });
  const msg = await received;
  assert.equal(msg.username, 'chatter_a');
  assert.equal(msg.body, 'Just hit my first muscle-up!');

  const tooFast = await new Promise((resolve) => sockA.emit('message', { body: 'again' }, resolve));
  assert.ok(tooFast.error);

  const history = await call('/channels/general/messages', { token: b.token });
  assert.equal(history.data.messages.at(-1).body, 'Just hit my first muscle-up!');

  sockA.disconnect();
  sockB.disconnect();
});

test('chat: rejects connections without a valid token', async () => {
  const sock = connect(base, { auth: { token: 'bogus' } });
  const err = await new Promise((resolve) => sock.on('connect_error', resolve));
  assert.equal(err.message, 'unauthorized');
  sock.disconnect();
});
