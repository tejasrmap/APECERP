import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db, auth } from '../firebase';

export default function Chat() {
  const { setFirestoreError } = useOutletContext<any>();

  const [messages, setMessages] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [newMessageText, setNewMessageText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChatLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Chat Listener
  useEffect(() => {
    if (!db) {
      setIsChatLoading(false);
      return;
    }

    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let timeStr = '';
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnapshot.id,
          senderEmail: data.senderEmail,
          text: data.text,
          time: timeStr
        };
      });
      setMessages(msgs);
      setIsChatLoading(false);
    }, (err) => {
      console.error('Chat listener error:', err);
      setFirestoreError(err.code);
      setIsChatLoading(false);
    });

    return () => unsubscribe();
  }, [setFirestoreError]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !db) return;
    const text = newMessageText;
    setNewMessageText('');
    try {
      await addDoc(collection(db, 'messages'), {
        text,
        senderEmail: auth?.currentUser?.email || 'admin@apec.com',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (isChatLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col min-h-[500px] bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md h-full"
    >
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Central Operations Channel</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Real-time chat syncing live messages in Firestore</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
          <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Live Sync</span>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[55vh] min-h-[350px] scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-12 h-12 text-slate-800 mb-2" />
            <p className="text-sm font-medium text-slate-400">Operational channel is silent</p>
            <p className="text-xs text-slate-600 mt-1">Send a message below to start chatting across devices!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isCurrentUser = m.senderEmail === (auth?.currentUser?.email || 'admin@apec.com');
            return (
              <div 
                key={m.id} 
                className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[10px] text-slate-500 mb-1 px-1 font-semibold truncate max-w-[200px]">
                  {m.senderEmail}
                </span>
                <div className={`p-3 rounded-2xl text-sm ${
                  isCurrentUser 
                    ? 'bg-red-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
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

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-3">
        <input 
          type="text" 
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder="Type an operations update..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm placeholder:text-slate-600 text-white"
        />
        <button 
          type="submit"
          disabled={!newMessageText.trim()}
          className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}
