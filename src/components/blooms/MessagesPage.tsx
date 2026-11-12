'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Send, Loader2, ArrowLeft, CheckCheck,
  Archive, ArchiveRestore, Users, Phone, Mail, X, Image,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PageProps { role: 'admin' | 'parent' | 'teacher' | 'student'; onNavigate?: (section: string) => void; seeded?: boolean; }
interface Msg { id: string; sender: string; senderRole: string; senderEmail: string; subject: string; content: string; read: boolean; archived: boolean; createdAt: string; }

const ROLE_COLORS: Record<string, string> = { admin: 'bg-amber-500', parent: 'bg-green-500', teacher: 'bg-sky-500', student: 'bg-purple-500' };
const ROLE_NAMES: Record<string, string> = { admin: 'Admin', parent: 'Parent', teacher: 'Teacher', student: 'Student' };
const SELF = { admin: 'System Administrator', parent: 'Jane Wanjiku', teacher: 'Mr. Ochieng', student: 'Alex Kamau' };

export default function MessagesPage({ role, seeded }: PageProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [newMsg, setNewMsg] = useState({ to: '', subject: '', content: '' });
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seeded) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/messages');
        if (!cancelled) setMessages(await res.json());
      } catch { /* */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [seeded]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, selectedContact]);

  const send = async () => {
    if (!newMsg.to || !newMsg.content) return toast.error('Fill recipient and message');
    try {
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: SELF[role], senderRole: role, senderEmail: `${role}@blooms.sc.ke`, subject: newMsg.subject || 'Message', content: newMsg.content }) });
      if (res.ok) { toast.success('Message sent!'); setComposeOpen(false); setNewMsg({ to: '', subject: '', content: '' }); } else toast.error('Failed');
    } catch { toast.error('Error'); }
  };

  const reply = async () => {
    if (!replyText || !selectedContact) return;
    try {
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: SELF[role], senderRole: role, senderEmail: `${role}@blooms.sc.ke`, subject: 'Reply', content: replyText }) });
      if (res.ok) { setReplyText(''); } else toast.error('Failed');
    } catch { toast.error('Error'); }
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/messages/${id}?XTransformPort=3000`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch { /* */ }
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    try {
      await fetch(`/api/messages/${id}?XTransformPort=3000`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: !archived }) });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch { /* */ }
  };

  // Group messages into conversations
  const conversations = messages.reduce<Record<string, Msg[]>>((acc, m) => {
    const key = m.sender;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const contactList = Object.entries(conversations).map(([name, msgs]) => ({
    name, role: msgs[0].senderRole, email: msgs[0].senderEmail,
    lastMsg: msgs[msgs.length - 1], unread: msgs.filter(m => !m.read && m.senderRole !== role).length,
  })).filter(c => role === 'admin' || c.name === SELF[role] || c.name === 'System Administrator');

  const filteredContacts = contactList.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const activeMessages = selectedContact ? (conversations[selectedContact] || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><MessageSquare className="text-amber-400" />Messages</h2>
        <Button onClick={() => setComposeOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black"><Send className="w-4 h-4 mr-2" />New Message</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[65vh]">
        {/* Contact List */}
        <div className="glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="pl-9 bg-white/[0.04] border-white/[0.08] h-8 text-sm" /></div>
          </div>
          <ScrollArea className="flex-1">
            {filteredContacts.map(c => (
              <div key={c.name} onClick={() => { setSelectedContact(c.name); if (c.lastMsg) markRead(c.lastMsg.id); }} className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors ${selectedContact === c.name ? 'bg-white/[0.06]' : ''}`}>
                <div className={`w-9 h-9 rounded-full ${ROLE_COLORS[c.role]} flex items-center justify-center text-white font-bold text-xs`}>{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><p className="text-white text-sm font-medium truncate">{c.name}</p>{c.unread > 0 && <Badge className="bg-amber-500 text-black text-[10px] h-5 w-5 flex items-center justify-center rounded-full">{c.unread}</Badge>}</div>
                  <p className="text-xs text-slate-500 truncate">{c.lastMsg?.content.slice(0, 30)}...</p>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No conversations</p>}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 glass-card rounded-xl flex flex-col">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-white/[0.06] flex items-center gap-3">
                <button onClick={() => setSelectedContact(null)} className="md:hidden text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[activeMessages[0]?.senderRole || 'admin']} flex items-center justify-center text-white font-bold text-xs`}>{selectedContact.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div><p className="text-white font-medium text-sm">{selectedContact}</p><p className="text-xs text-slate-500">{ROLE_NAMES[activeMessages[0]?.senderRole || 'admin']}</p></div>
              </div>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeMessages.map(msg => {
                  const isSelf = msg.sender === SELF[role];
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm relative ${isSelf ? 'bg-amber-500 text-black rounded-br-md' : 'bg-white/[0.08] text-white rounded-bl-md'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isSelf ? 'text-amber-700' : 'text-slate-500'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{msg.read && <CheckCheck className="inline ml-1 w-3 h-3" />}</p>
                      </div>
                    </motion.div>
                  );
                })}
                {activeMessages.length === 0 && <p className="text-center text-slate-500 py-10">No messages yet</p>}
              </div>
              {/* Reply Input */}
              <div className="p-3 border-t border-white/[0.06] flex gap-2">
                <Input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && reply()} placeholder="Type a message..." className="flex-1 bg-white/[0.04] border-white/[0.08] h-10 text-sm" />
                <Button onClick={reply} className="bg-amber-500 hover:bg-amber-600 text-black h-10"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center"><MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-500">Select a conversation to start chatting</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="bg-[#0f172a] border-white/[0.08]">
          <DialogHeader><DialogTitle className="text-white">New Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm text-slate-300">To</label><Select value={newMsg.to} onValueChange={v => setNewMsg({ ...newMsg, to: v })}><SelectTrigger className="bg-white/[0.04] border-white/[0.08]"><SelectValue placeholder="Select recipient" /></SelectTrigger><SelectContent>
              {role === 'admin' ? Object.entries(SELF).filter(([k]) => k !== 'admin').map(([k, v]) => <SelectItem key={k} value={v}>{v} ({ROLE_NAMES[k]})</SelectItem>) : <SelectItem value="System Administrator">Admin</SelectItem>}
            </SelectContent></Select></div>
            <div><label className="text-sm text-slate-300">Subject</label><Input value={newMsg.subject} onChange={e => setNewMsg({ ...newMsg, subject: e.target.value })} className="bg-white/[0.04] border-white/[0.08]" placeholder="Subject" /></div>
            <div><label className="text-sm text-slate-300">Message</label><textarea value={newMsg.content} onChange={e => setNewMsg({ ...newMsg, content: e.target.value })} rows={4} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-2 text-sm text-white placeholder:text-slate-500" placeholder="Type your message..." /></div>
          </div>
          <DialogFooter><Button onClick={send} className="bg-amber-500 hover:bg-amber-600 text-black"><Send className="w-4 h-4 mr-2" />Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
