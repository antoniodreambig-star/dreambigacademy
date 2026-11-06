'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteMessage, deleteThread, sendMessage } from '@/app/(app)/messages/actions';
import type { Message } from '@/lib/types';

export default function Thread({
  threadStudentId,
  meId,
  initial,
  names,
  deleteMode = 'none',
}: {
  threadStudentId: string;
  meId: string;
  initial: Message[];
  names: Record<string, string>;
  /** 'all' = can delete any message and the whole conversation, 'own' = only messages they sent, 'none' = no deleting. */
  deleteMode?: 'all' | 'own' | 'none';
}) {
  const [msgs, setMsgs] = useState<Message[]>(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null); // message id, or 'thread'
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`thread-${threadStudentId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_student_id=eq.${threadStudentId}` }, (p) => {
        const m = p.new as Message;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMsgs((cur) => cur.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadStudentId]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    const r = await sendMessage(threadStudentId, text);
    setBusy(false);
    if (!r.ok) return setError(r.error || 'That message didn’t send.');
    setText('');
  }

  async function remove(id: string) {
    setError('');
    const r = await deleteMessage(id);
    setConfirm(null);
    if (!r.ok) return setError(r.error || 'That message couldn’t be deleted.');
    setMsgs((cur) => cur.filter((x) => x.id !== id));
  }

  async function removeAll() {
    setError('');
    const r = await deleteThread(threadStudentId);
    setConfirm(null);
    if (!r.ok) return setError(r.error || 'The conversation couldn’t be deleted.');
    setMsgs([]);
  }

  const canDelete = (m: Message) => deleteMode === 'all' || (deleteMode === 'own' && m.sender_id === meId);

  return (
    <div>
      <div className="thread" ref={box} aria-live="polite">
        {msgs.length === 0 && <p className="muted">No messages yet. Ask a question any time.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`msg${m.sender_id === meId ? ' msg--me' : ''}`}>
            {m.sender_id !== meId && <strong style={{ display: 'block', fontSize: 13 }}>{names[m.sender_id] || 'Instructor'}</strong>}
            {m.body}
            <small>{new Date(m.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>
            {canDelete(m) &&
              (confirm === m.id ? (
                <span className="msg__del">
                  Delete this message?{' '}
                  <button type="button" onClick={() => remove(m.id)}>Yes, delete</button>
                  <button type="button" onClick={() => setConfirm(null)}>Cancel</button>
                </span>
              ) : (
                <span className="msg__del">
                  <button type="button" onClick={() => setConfirm(m.id)} aria-label="Delete message">Delete</button>
                </span>
              ))}
          </div>
        ))}
      </div>
      {deleteMode === 'all' && msgs.length > 0 && (
        <p style={{ margin: '14px 0 0' }}>
          {confirm === 'thread' ? (
            <>
              <span className="small">Delete the whole conversation? This can’t be undone.</span>{' '}
              <button type="button" className="btn btn--danger btn--sm" onClick={removeAll}>Yes, delete all</button>{' '}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(null)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirm('thread')}>Delete conversation</button>
          )}
        </p>
      )}
      {error && <div className="notice notice--err" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      <form className="compose" onSubmit={submit}>
        <div style={{ flex: 1 }}>
          <label htmlFor="msg" className="screen-reader-text" style={{ position: 'absolute', left: -9999 }}>Message</label>
          <textarea id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" maxLength={4000}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }} />
        </div>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
      </form>
    </div>
  );
}
