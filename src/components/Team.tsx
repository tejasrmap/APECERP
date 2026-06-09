import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Loader2,
  Search,
  Phone,
  Briefcase,
  Calendar,
  Award,
  Wifi
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Team() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTeamLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!db) {
      setIsTeamLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamList(members);
      setIsTeamLoading(false);
    }, (err) => {
      console.error('Team listener error:', err);
      setFirestoreError(err.code);
      setIsTeamLoading(false);
    });

    return () => unsubTeam();
  }, [setFirestoreError]);

  const handleDeleteDocument = async (colName: string, id: string, docNameForLog?: string) => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, colName, id));
      // Log activity
      if (docNameForLog) {
        await addDoc(collection(db, 'activities'), {
          title: `${colName.slice(0, -1)} removed`,
          desc: `"${docNameForLog}" was deleted from the ERP database`,
          type: 'settings',
          timestamp: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  if (isTeamLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a13]/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  const filteredTeam = teamList.filter(m => {
    const term = searchTerm.toLowerCase();
    const nameMatch = m.name?.toLowerCase().includes(term) || false;
    const emailMatch = m.email?.toLowerCase().includes(term) || false;
    const roleMatch = m.role?.toLowerCase().includes(term) || false;
    const deptMatch = m.department?.toLowerCase().includes(term) || false;
    const skillMatch = m.skills?.some((s: string) => s.toLowerCase().includes(term)) || false;
    const nfcMatch = m.nfcTagUid?.toLowerCase().includes(term) || false;
    return nameMatch || emailMatch || roleMatch || deptMatch || skillMatch || nfcMatch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Engineering Team</h3>
          <p className="text-xs text-slate-400 mt-1">Registered technicians, safety personnel, and managers</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, skills, department, NFC..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-slate-100 placeholder:text-slate-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
          />
        </div>
      </div>

      {teamList.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-2xl py-20 text-center flex flex-col items-center shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <Users className="w-14 h-14 text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400">No team members registered</p>
          <p className="text-xs text-slate-500 mt-1">Populate profiles in the Team Control panel.</p>
        </div>
      ) : filteredTeam.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-2xl py-20 text-center flex flex-col items-center shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <Users className="w-14 h-14 text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400">No team members match your search</p>
          <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-cyan-400 hover:underline font-bold">Clear Search Filter</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredTeam.map((m) => {
            const isMemberAdmin = m.accessRole === 'Admin' || m.roleType === 'Admin' || [
              'admin@apecpowersolutions.com',
              'managingdirector@apecpowersolutions.com'
            ].includes(m.email?.toLowerCase());

            const avatarColors: Record<string, string> = {
              cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
              blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
              red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
              gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20'
            };
            const avatarClass = avatarColors[m.avatar || 'cyan'] || avatarColors.cyan;

            return (
              <div key={m.id} className="p-6 rounded-2xl glass-card flex flex-col relative group hover:border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDocument('team', m.id, m.name)}
                    disabled={isDbActionLoading}
                    className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded hover:bg-rose-955/20 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarClass} border flex items-center justify-center text-sm font-bold shadow-sm`}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                      {m.employeeId || 'APEC-MEMBER'}
                    </span>
                    {m.nfcTagUid && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-405 border border-cyan-500/20 text-[7px] font-mono tracking-widest font-extrabold uppercase shadow-[0_0_8px_rgba(6,182,212,0.1)]" title={`NFC Card Linked: ${m.nfcTagUid}`}>
                        <Wifi className="w-2.5 h-2.5 animate-pulse" />
                        RFID ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-100 leading-snug truncate" title={m.name}>{m.name}</h4>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-rose-500 font-bold tracking-wide truncate max-w-[120px]" title={m.role}>{m.role}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                    isMemberAdmin
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  } border`}>
                    {isMemberAdmin ? 'Admin' : 'User'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-4 pt-3 border-t border-slate-900 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Briefcase className="w-3.5 h-3.5 text-slate-605 shrink-0 text-slate-600" />
                    <span className="truncate">{m.department || 'Operations'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-605 shrink-0 text-slate-600" />
                    <span>{m.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider">Join:</span>
                    <span>{m.joinedDate ? new Date(m.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                    m.status === 'Site Visit' ? 'bg-cyan-955/40 text-cyan-400 border border-cyan-500/25' :
                    'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                  }`}>
                    {m.status}
                  </span>
                </div>

                {/* Skills Preview */}
                {m.skills && m.skills.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <div className="flex flex-wrap gap-1">
                      {m.skills.slice(0, 3).map((skill: string, sIdx: number) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-900 text-[8px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-0.5 text-slate-400">
                          <Award className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
                          {skill}
                        </span>
                      ))}
                      {m.skills.length > 3 && (
                        <span className="text-[8px] font-bold text-slate-500 flex items-center pl-1">
                          +{m.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
