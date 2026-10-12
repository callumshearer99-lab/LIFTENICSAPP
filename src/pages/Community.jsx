import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, getToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi } from '../useApi.js';

function mergeMessages(existing, incoming) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function formatTime(sqlDate) {
  const d = new Date(`${sqlDate.replace(' ', 'T')}Z`);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name }) {
  // Stable colour per username.
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (
    <span className="avatar" style={{ background: `hsl(${Math.abs(hash) % 360} 55% 45%)` }} aria-hidden="true">
      {name[0].toUpperCase()}
    </span>
  );
}

export default function Community() {
  const { channel: channelParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: channelData } = useApi('/channels');
  const channels = channelData?.channels ?? [];
  const channelSlug = channelParam || 'general';
  const current = channels.find((c) => c.slug === channelSlug);

  const socketRef = useRef(null);
  const channelRef = useRef(channelSlug);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [online, setOnline] = useState(0);
  const [typing, setTyping] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // One socket for the lifetime of the page.
  useEffect(() => {
    const socket = io({ auth: { token: getToken() } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', channelRef.current);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('message', (m) => {
      if (m.channel === channelRef.current) setMessages((prev) => mergeMessages(prev, [m]));
    });
    socket.on('presence', (p) => {
      if (p.channel === channelRef.current) setOnline(p.online);
    });
    let typingTimer;
    socket.on('typing', ({ username }) => {
      setTyping(username);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => setTyping(null), 2500);
    });
    return () => {
      clearTimeout(typingTimer);
      socket.disconnect();
    };
  }, []);

  // Switch channel: load history and join the room.
  useEffect(() => {
    channelRef.current = channelSlug;
    stickToBottom.current = true;
    setMessages([]);
    setTyping(null);
    setError('');
    let stale = false;
    api(`/channels/${channelSlug}/messages`)
      .then((d) => {
        if (stale) return;
        setMessages((prev) => mergeMessages(prev, d.messages));
        setHasMore(d.hasMore);
      })
      .catch((err) => !stale && setError(err.message));
    if (socketRef.current?.connected) socketRef.current.emit('join', channelSlug);
    return () => {
      stale = true;
    };
  }, [channelSlug]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    const el = listRef.current;
    const prevHeight = el.scrollHeight;
    stickToBottom.current = false;
    const d = await api(`/channels/${channelSlug}/messages?before=${messages[0]?.id ?? ''}`);
    setMessages((prev) => mergeMessages(prev, d.messages));
    setHasMore(d.hasMore);
    requestAnimationFrame(() => (el.scrollTop = el.scrollHeight - prevHeight));
  }

  function onScroll() {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  const lastTypingSent = useRef(0);
  function onDraftChange(e) {
    setDraft(e.target.value);
    if (Date.now() - lastTypingSent.current > 1500) {
      lastTypingSent.current = Date.now();
      socketRef.current?.emit('typing');
    }
  }

  function send(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    stickToBottom.current = true;
    socketRef.current.emit('message', { body }, (res) => {
      if (res?.error) setError(res.error);
      else {
        setDraft('');
        setError('');
      }
    });
  }

  return (
    <div className="chat">
      <aside className="channels">
        <h2>Channels</h2>
        <select className="channel-select" value={channelSlug} onChange={(e) => navigate(`/community/${e.target.value}`)} aria-label="Channel">
          {channels.map((c) => <option key={c.slug} value={c.slug}># {c.name}</option>)}
        </select>
        <ul>
          {channels.map((c) => (
            <li key={c.slug}>
              <NavLink to={`/community/${c.slug}`} className={c.slug === channelSlug ? 'active' : ''}>
                # {c.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <section className="chat-main">
        <header className="chat-head">
          <div>
            <h1># {current?.name ?? channelSlug}</h1>
            <p className="small muted">{current?.description}</p>
          </div>
          <span className={`status ${connected ? 'on' : ''}`}>
            {connected ? `${online} online` : 'Connecting…'}
          </span>
        </header>

        <div className="messages" ref={listRef} onScroll={onScroll}>
          {hasMore && (
            <button className="btn ghost small load-older" onClick={loadOlder}>Load older messages</button>
          )}
          {messages.length === 0 && <p className="muted center">No messages yet. Say hi! 👋</p>}
          {messages.map((m, i) => {
            const grouped = i > 0 && messages[i - 1].username === m.username;
            return (
              <div key={m.id} className={`msg ${grouped ? 'grouped' : ''} ${m.username === user.username ? 'mine' : ''}`}>
                {!grouped && <Avatar name={m.username} />}
                <div>
                  {!grouped && (
                    <div className="msg-meta">
                      <strong>{m.username}</strong> <span className="small muted">{formatTime(m.createdAt)}</span>
                    </div>
                  )}
                  <p className="msg-body">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="typing small muted">{typing ? `${typing} is typing…` : ' '}</p>
        {error && <p className="error small">{error}</p>}
        <form className="composer" onSubmit={send}>
          <textarea
            value={draft}
            onChange={onDraftChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            placeholder={`Message #${current?.name ?? channelSlug}`}
            maxLength={1000}
            rows={1}
          />
          <button className="btn" disabled={!connected || !draft.trim()}>Send</button>
        </form>
      </section>
    </div>
  );
}
