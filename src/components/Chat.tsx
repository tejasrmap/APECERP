import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Search, 
  Users, 
  ArrowLeft,
  User
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db, auth } from '../firebase';

export default function Chat() {
  const { setFirestoreError } = useOutletContext<any>();

  // States
  const [messages, setMessages] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>('group'); // 'group' or a contact object
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list'); // Mobile responsiveness

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  const currentUserEmail = auth?.currentUser?.email || 'admin@apec.com';
  const currentUserName = auth?.currentUser?.displayName || currentUserEmail.split('@')[0];

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChatLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // 1. Fetch team members contact list
  useEffect(() => {
    if (!db) return;

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Exclude current user from contact list
        .filter((m: any) => m.email !== currentUserEmail);
      setTeamList(members);
    }, (err) => {
      console.error('Team contact list load error:', err);
      setFirestoreError(err.code);
    });

    return () => unsubTeam();
  }, [currentUserEmail, setFirestoreError]);

  // 2. Resolve room ID based on selected chat
  const activeRoomId = selectedChat === 'group' 
    ? 'group' 
    : [currentUserEmail, selectedChat.email].sort().join('--');

  // 3. Listen to messages and filter/sort client-side to avoid Firestore index requirements
  useEffect(() => {
    if (!db) {
      setIsChatLoading(false);
      return;
    }

    setIsChatLoading(true);
    const q = query(collection(db, 'messages'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          let timeStr = '';
          if (data.timestamp) {
            const date = data.timestamp.toDate();
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          return {
            id: docSnapshot.id,
            roomId: data.roomId || 'group',
            senderEmail: data.senderEmail,
            senderName: data.senderName || data.senderEmail?.split('@')[0] || 'Unknown',
            text: data.text,
            time: timeStr,
            timestampValue: data.timestamp?.toDate().getTime() || 0
          };
        })
        .filter(m => m.roomId === activeRoomId)
        .sort((a, b) => a.timestampValue - b.timestampValue);

      setMessages(msgs);
      setIsChatLoading(false);
    }, (err) => {
      console.error('Chat listener error:', err);
      setFirestoreError(err.code);
      setIsChatLoading(false);
    });

    return () => unsubscribe();
  }, [activeRoomId, setFirestoreError]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !db) return;
    const text = newMessageText;
    setNewMessageText('');
    try {
      await addDoc(collection(db, 'messages'), {
        roomId: activeRoomId,
        text,
        senderEmail: currentUserEmail,
        senderName: currentUserName,
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Filter contacts by search query
  const filteredContacts = teamList.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Site Visit':
        return 'bg-blue-500';
      case 'On Leave':
      default:
        return 'bg-amber-500';
    }
  };

  const getInitials = (name: string) => {
    return name ? name.slice(0, 2).toUpperCase() : 'PM';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md h-[calc(100vh-160px)] min-h-[500px]"
    >
      {/* Contact List Panel (Left) */}
      <div 
        className={`w-full md:w-80 border-r border-slate-850 flex flex-col shrink-0 bg-slate-950/20 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Contact List Header */}
        <div className="p-4 border-b border-slate-800/80">
          <h3 className="text-sm font-bold text-white mb-3 tracking-wide uppercase">Operational Chats</h3>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-red-500/50 transition-all text-white placeholder:text-slate-650"
            />
          </div>
        </div>

        {/* Channels/Contacts Scroller */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          
          {/* Central Channel Chat Card */}
          <button
            onClick={() => { setSelectedChat('group'); setMobileView('chat'); }}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
              selectedChat === 'group' 
                ? 'bg-red-600/10 border border-red-500/20 text-white' 
                : 'hover:bg-slate-850/50 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold truncate text-white">Central Channel</span>
                <span className="text-[9px] text-slate-500">Public</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">APEC Operations Chatroom</p>
            </div>
          </button>

          <div className="pt-2 pb-1 px-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Direct Messages</span>
          </div>

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => { setSelectedChat(contact); setMobileView('chat'); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                  selectedChat !== 'group' && selectedChat.email === contact.email
                    ? 'bg-red-600/10 border border-red-500/20 text-white' 
                    : 'hover:bg-slate-850/50 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {/* Avatar Initials with online status indicator */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-350 shadow">
                    {getInitials(contact.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${getStatusColor(contact.status)}`}></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold truncate text-slate-200">{contact.name}</span>
                    <span className="text-[8px] text-red-500 uppercase tracking-widest font-bold font-sans">{contact.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{contact.role}</p>
                </div>
              </button>
            ))
          )}

        </div>
      </div>

      {/* Conversation Panel (Right) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 relative ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {selectedChat === 'group' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Central Operations Channel</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Real-time group chat for all active project managers</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                    {getInitials(selectedChat.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${getStatusColor(selectedChat.status)}`}></span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedChat.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedChat.role} • {selectedChat.email}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
            <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Live Sync</span>
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-320px)] scrollbar-thin">
          {isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MessageSquare className="w-12 h-12 text-slate-850 mb-2" />
              <p className="text-sm font-medium text-slate-400">
                {selectedChat === 'group' 
                  ? 'No updates in this operational channel' 
                  : `Conversation with ${selectedChat.name} has not started`}
              </p>
              <p className="text-xs text-slate-650 mt-1">Send a message below to start syncing updates!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isCurrentUser = m.senderEmail === currentUserEmail;
              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-1 px-1 font-semibold truncate max-w-[200px]">
                    {isCurrentUser ? 'You' : m.senderName}
                  </span>
                  <div className={`p-3 rounded-2xl text-sm ${
                    isCurrentUser 
                      ? 'bg-red-650 text-white rounded-tr-none' 
                      : 'bg-slate-850 text-slate-200 rounded-tl-none border border-slate-800/80 shadow-md'
                  }`}>
                    <p className="leading-normal break-words">{m.text}</p>
                    <span className={`block text-[8px] text-right mt-1.5 ${isCurrentUser ? 'text-white/60' : 'text-slate-500'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input panel */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/20 flex items-center gap-3">
          <input 
            type="text" 
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            placeholder={
              selectedChat === 'group' 
                ? "Broadcast an operations update..." 
                : `Send a direct message to ${selectedChat.name}...`
            }
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm placeholder:text-slate-650 text-white"
          />
          <button 
            type="submit"
            disabled={!newMessageText.trim()}
            className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </motion.div>
  );
}
