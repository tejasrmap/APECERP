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
      className="flex-1 flex glass-card rounded-2xl overflow-hidden h-[calc(100vh-160px)] min-h-[500px] shadow-[0_12px_40px_rgba(15,23,42,0.04)] border border-white/60"
    >
      {/* Contact List Panel (Left) */}
      <div 
        className={`w-full md:w-80 border-r border-slate-200/60 flex flex-col shrink-0 bg-white/30 backdrop-blur-md ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Contact List Header */}
        <div className="p-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-sm">
          <h3 className="text-xs font-bold text-slate-500 mb-3 tracking-wider uppercase">Operational Chats</h3>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0e2a47] transition-colors" />
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/85 border border-slate-200/80 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 transition-all text-slate-900 placeholder:text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
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
                ? 'bg-white/80 border-white/80 text-[#0e2a47] font-semibold shadow-[0_4px_16px_rgba(15,23,42,0.03)] glowing-active' 
                : 'hover:bg-white/40 border-transparent hover:border-white/30 text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold truncate text-slate-900">Central Channel</span>
                <span className="text-[9px] text-slate-400 font-medium">Public</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">APEC Operations Chatroom</p>
            </div>
          </button>

          <div className="pt-3 pb-1 px-3">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Direct Messages</span>
          </div>

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => { setSelectedChat(contact); setMobileView('chat'); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${
                  selectedChat !== 'group' && selectedChat.email === contact.email
                    ? 'bg-white/80 border-white/80 text-[#0e2a47] font-semibold shadow-[0_4px_16px_rgba(15,23,42,0.03)] glowing-active' 
                    : 'hover:bg-white/40 border-transparent hover:border-white/30 text-slate-600 hover:text-slate-900'
                }`}
              >
                {/* Avatar Initials with online status indicator */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-xs font-semibold text-slate-700 shadow-sm">
                    {getInitials(contact.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold truncate text-slate-800">{contact.name}</span>
                    <span className="text-[8px] text-red-655 uppercase tracking-widest font-bold font-sans">{contact.status}</span>
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
        className={`flex-1 flex flex-col min-w-0 relative bg-white/20 backdrop-blur-md ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200/60 bg-white/40 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {selectedChat === 'group' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Central Operations Channel</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Real-time group chat for all active project managers</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                    {getInitials(selectedChat.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(selectedChat.status)}`}></span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{selectedChat.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedChat.role} • {selectedChat.email}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200/50 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
            <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Live Sync</span>
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-320px)] scrollbar-thin bg-slate-50/10">
          {isChatLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#0e2a47]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">
                {selectedChat === 'group' 
                  ? 'No updates in this operational channel' 
                  : `Conversation with ${selectedChat.name} has not started`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Send a message below to start syncing updates!</p>
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
                  <span className="text-[10px] text-slate-450 mb-1 px-1 font-semibold truncate max-w-[200px]">
                    {isCurrentUser ? 'You' : m.senderName}
                  </span>
                  
                  <div className={`p-3.5 rounded-2xl text-sm ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-[#0e2a47] to-[#1a3d64] text-white rounded-tr-none shadow-[0_4px_14px_rgba(14,42,71,0.15)] border border-[#0e2a47]/40' 
                      : 'bg-white/90 text-slate-800 rounded-tl-none border border-white shadow-[0_4px_14px_rgba(15,23,42,0.03)]'
                  }`}>
                    
                    {/* Render Image Attachments Inline */}
                    {m.fileUrl && isImage && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-200 max-w-xs aspect-video bg-slate-100 flex items-center justify-center group relative shadow-inner">
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
                        className="mb-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 hover:border-slate-350 transition-all max-w-xs group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold text-slate-900 truncate">{m.fileName}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">{m.fileType?.split('/')[1] || 'document'}</p>
                        </div>
                        <div className="w-7 h-7 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-655 shrink-0 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    )}

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
        {/* Selected File Preview Box */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="p-3 bg-white/60 backdrop-blur-sm border-t border-slate-200/50 flex items-center justify-between gap-3 shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-slate-900 truncate">{attachedFile.name}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {(attachedFile.size / 1024 / 1024).toFixed(2)} MB • {attachedFile.type || 'unknown type'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input panel */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-sm flex items-center gap-3">
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
            className="p-3 bg-white border border-slate-200/80 hover:border-slate-350 text-slate-500 hover:text-slate-850 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center disabled:opacity-50"
          >
            {fileUploading ? <Loader2 className="w-4 h-4 animate-spin text-[#0e2a47]" /> : <Paperclip className="w-4 h-4" />}
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
            className="flex-1 bg-white border border-slate-200/80 rounded-xl py-3 px-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 text-sm placeholder:text-slate-400 text-slate-900 disabled:opacity-50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
          />
          <button 
            type="submit"
            disabled={fileUploading || (!newMessageText.trim() && !attachedFile)}
            className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl shadow-[0_4px_12px_rgba(220,38,38,0.2)] transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      {/* Contextual Assets Panel (Right) */}
      <div className="hidden xl:flex w-80 border-l border-slate-200/60 flex-col bg-white/30 backdrop-blur-md p-4 space-y-6 overflow-y-auto shrink-0 select-none">
        <div>
          <h3 className="text-xs font-bold text-slate-450 tracking-wider uppercase">Contextual Assets</h3>
        </div>

        {/* Substation 4 Location */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Substation 4 Location</h4>
          <div className="rounded-xl overflow-hidden border border-white bg-white/60 aspect-video relative shadow-sm hover:shadow-md transition-shadow">
            <img src="/substation_map.png" alt="Substation Map" className="w-full h-full object-cover" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-650 rounded-full border-2 border-white shadow-[0_0_12px_rgba(220,38,38,0.95)] animate-pulse" />
          </div>
        </div>

        {/* Real-time Telemetry */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Real-time Telemetry</h4>
          
          <div className="p-4 bg-white/70 border border-white shadow-[0_4px_16px_rgba(15,23,42,0.02)] rounded-xl space-y-3">
            {/* Core Temp */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Core Temp</span>
                <span className="text-xs font-bold text-red-650">84°C</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '84%' }} />
              </div>
            </div>

            {/* Grid Load */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Grid Load</span>
                <span className="text-xs font-bold text-slate-900">14.2 MW</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-950 rounded-full" style={{ width: '57%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Shared Documentation */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Shared Documentation</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/70 border border-white rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-slate-300 shadow-[0_4px_12px_rgba(15,23,42,0.015)] transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold text-slate-705 text-center truncate w-full">Wiring_Diag.pdf</span>
            </div>
            
            <div className="p-3 bg-white/70 border border-white rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-slate-300 shadow-[0_4px_12px_rgba(15,23,42,0.015)] transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold text-slate-705 text-center truncate w-full">Load_Profile.xlsx</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="button"
            className="w-full py-3 bg-gradient-to-r from-[#0e2a47] to-[#1e4670] hover:from-[#0a2540] hover:to-[#173d63] text-white rounded-xl text-xs font-semibold shadow-[0_4px_14px_rgba(14,42,71,0.15)] hover:shadow-lg transition-all uppercase tracking-wider"
          >
            Create Work Order
          </button>
        </div>
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
