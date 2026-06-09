import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Search, 
  Users, 
  ArrowLeft,
  Paperclip,
  FileText,
  Download,
  X
} from 'lucide-react';
import { collection, onSnapshot, query, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useOutletContext } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { supabase } from '../supabase';
import PDFViewerModal from './PDFViewerModal';
import ImageViewerModal from './ImageViewerModal';

export default function Chat() {
  const { setFirestoreError } = useOutletContext<any>();

  // States
  const [messages, setMessages] = useState<any[]>([]);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>('group'); // 'group' or a contact object
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list'); // Mobile responsiveness

  // File Upload states
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            timestampValue: data.timestamp?.toDate().getTime() || 0,
            fileUrl: data.fileUrl || '',
            fileName: data.fileName || '',
            fileType: data.fileType || ''
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachedFile) return;
    if (!db) return;

    const text = newMessageText;
    const file = attachedFile;

    setNewMessageText('');
    setAttachedFile(null);
    setFileUploading(true);

    try {
      let fileUrl = '';
      let fileName = '';
      let fileType = '';

      if (file) {
        if (supabase) {
          const path = `chat_files/${activeRoomId}/${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('APECERP')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('APECERP')
            .getPublicUrl(path);

          fileUrl = urlData.publicUrl;
        } else if (storage) {
          // Create storage reference path
          const fileRef = ref(storage, `chat_files/${activeRoomId}/${Date.now()}_${file.name}`);
          // Upload bytes
          const snapshot = await uploadBytes(fileRef, file);
          // Get download URL
          fileUrl = await getDownloadURL(snapshot.ref);
        } else {
          throw new Error('No storage provider (Supabase or Firebase) is configured.');
        }

        fileName = file.name;
        fileType = file.type;
      }

      await addDoc(collection(db, 'messages'), {
        roomId: activeRoomId,
        text: text || '',
        senderEmail: currentUserEmail,
        senderName: currentUserName,
        timestamp: Timestamp.now(),
        ...(fileUrl ? { fileUrl, fileName, fileType } : {})
      });
    } catch (err: any) {
      console.error('Error sending message with attachment:', err);
      setFirestoreError(err.code || 'storage-upload-failed');
    } finally {
      setFileUploading(false);
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
      className="flex-1 flex glass-card rounded-2xl overflow-hidden h-[calc(100vh-115px)] md:h-[calc(100vh-160px)] min-h-[450px] md:min-h-[500px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-white/10"
    >
      {/* Contact List Panel (Left) */}
      <div 
        className={`w-full md:w-80 border-r border-slate-800 flex flex-col shrink-0 bg-slate-950/20 backdrop-blur-md ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Contact List Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/45 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase">Operational Chats</h3>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-slate-100 placeholder:text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            />
          </div>
        </div>

        {/* Channels/Contacts Scroller */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          
          {/* Central Channel Chat Card */}
          <button
            onClick={() => { setSelectedChat('group'); setMobileView('chat'); }}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${
              selectedChat === 'group' 
                ? 'bg-cyan-950/40 border-cyan-500/35 text-cyan-400 font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.2)] glowing-active' 
                : 'hover:bg-slate-900/30 border-transparent hover:border-slate-800/40 text-slate-400 hover:text-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-rose-955/20 border border-rose-800/50 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold truncate text-slate-100">Central Channel</span>
                <span className="text-[9px] text-slate-550 font-medium">Public</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">APEC Operations Chatroom</p>
            </div>
          </button>

          <div className="pt-3 pb-1 px-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Direct Messages</span>
          </div>

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-550">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => { setSelectedChat(contact); setMobileView('chat'); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${
                  selectedChat !== 'group' && selectedChat.email === contact.email
                    ? 'bg-cyan-950/40 border-cyan-500/35 text-cyan-400 font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.2)] glowing-active' 
                    : 'hover:bg-slate-900/30 border-transparent hover:border-slate-800/40 text-slate-400 hover:text-slate-100'
                }`}
              >
                {/* Avatar Initials with online status indicator */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shadow-sm">
                    {getInitials(contact.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${getStatusColor(contact.status)}`}></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold truncate text-slate-200">{contact.name}</span>
                    <span className="text-[8px] text-rose-500 uppercase tracking-widest font-bold font-sans">{contact.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{contact.role}</p>
                </div>
              </button>
            ))
          )}

        </div>
      </div>

      {/* Conversation Panel (Right) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 relative bg-slate-950/20 backdrop-blur-md ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/45 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {selectedChat === 'group' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-rose-955/20 border border-rose-800/50 flex items-center justify-center text-rose-500 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Central Operations Channel</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time group chat for all active project managers</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                    {getInitials(selectedChat.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${getStatusColor(selectedChat.status)}`}></span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{selectedChat.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedChat.role} • {selectedChat.email}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/25 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] text-emerald-450 font-semibold uppercase tracking-wider text-emerald-400">Live Sync</span>
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 scrollbar-thin bg-slate-950/10">
          {isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-400">
                {selectedChat === 'group' 
                  ? 'No updates in this operational channel' 
                  : `Conversation with ${selectedChat.name} has not started`}
              </p>
              <p className="text-xs text-slate-500 mt-1">Send a message below to start syncing updates!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isCurrentUser = m.senderEmail === currentUserEmail;
              const isImage = m.fileType?.startsWith('image/');
              
              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-1 px-1 font-semibold truncate max-w-[200px]">
                    {isCurrentUser ? 'You' : m.senderName}
                  </span>
                  
                  <div className={`p-3.5 rounded-2xl text-sm ${
                    isCurrentUser 
                      ? 'bg-[#0f283d] text-slate-100 rounded-tr-none shadow-[0_4px_14px_rgba(6,182,212,0.1)] border border-cyan-500/30' 
                      : 'bg-slate-900/85 text-slate-100 rounded-tl-none border border-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.25)]'
                  }`}>
                    
                    {/* Render Image Attachments Inline */}
                    {m.fileUrl && isImage && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-805 max-w-xs aspect-video bg-slate-950/60 flex items-center justify-center group relative shadow-inner">
                        <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover p-0.5" />
                        <button 
                          onClick={() => setViewingImage({ url: m.fileUrl, name: m.fileName })}
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 text-xs font-semibold gap-1.5 cursor-pointer w-full h-full border-none"
                        >
                          <Download className="w-4 h-4" /> View Image
                        </button>
                      </div>
                    )}

                    {/* Render Other Document Attachments as download cards */}
                    {m.fileUrl && !isImage && (
                      <a 
                        href={m.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          const isPdf = m.fileName?.toLowerCase().endsWith('.pdf') || m.fileType === 'application/pdf';
                          if (isPdf) {
                            e.preventDefault();
                            setViewingPdf({ url: m.fileUrl, name: m.fileName });
                          }
                        }}
                        className="mb-2.5 p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-900/60 border border-slate-800 flex items-center gap-3 hover:border-slate-700 transition-all max-w-xs group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-rose-955/20 border border-rose-800/40 flex items-center justify-center text-rose-500 shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold text-slate-200 truncate">{m.fileName}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{m.fileType?.split('/')[1] || 'document'}</p>
                        </div>
                        <div className="w-7 h-7 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-slate-300 shrink-0 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    )}

                    <p className="leading-normal break-words">{m.text}</p>
                    <span className={`block text-[8px] text-right mt-1.5 ${isCurrentUser ? 'text-slate-400' : 'text-slate-500'}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Selected File Preview Box */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="p-3 bg-slate-900/60 backdrop-blur-sm border-t border-slate-800 flex items-center justify-between gap-3 shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-rose-955/20 border border-rose-800/40 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-slate-200 truncate">{attachedFile.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {(attachedFile.size / 1024 / 1024).toFixed(2)} MB • {attachedFile.type || 'unknown type'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input panel */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/45 backdrop-blur-sm flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={fileUploading}
            className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center disabled:opacity-50"
          >
            {fileUploading ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Paperclip className="w-4 h-4" />}
          </button>
          
          <input 
            type="text" 
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            disabled={fileUploading}
            placeholder={
              selectedChat === 'group' 
                ? "Broadcast an operations update..." 
                : `Send a direct message to ${selectedChat.name}...`
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-sm placeholder:text-slate-500 text-slate-100 disabled:opacity-50 shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          />
          <button 
            type="submit"
            disabled={fileUploading || (!newMessageText.trim() && !attachedFile)}
            className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-[0_4px_12px_rgba(6,182,212,0.25)] transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>


      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={!!viewingPdf}
        onClose={() => setViewingPdf(null)}
        fileUrl={viewingPdf?.url || ''}
        fileName={viewingPdf?.name || ''}
      />

      {/* Photo Viewer Modal */}
      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url || ''}
        imageName={viewingImage?.name || ''}
      />

    </motion.div>
  );
}
