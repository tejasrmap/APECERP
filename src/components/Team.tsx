import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Team() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-100">Engineering Team</h3>
        <p className="text-xs text-slate-400 mt-1">Registered technicians, safety personnel, and managers</p>
      </div>

      {teamList.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-2xl py-20 text-center flex flex-col items-center shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <Users className="w-14 h-14 text-slate-755 mb-3 text-slate-700" />
          <p className="text-sm font-medium text-slate-400">No team members registered</p>
          <p className="text-xs text-slate-500 mt-1">Populate profiles using Seeding settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {teamList.map((m) => {
            const isMemberAdmin = m.accessRole === 'Admin' || m.roleType === 'Admin' || [
              'admin@apecpowersolutions.com',
              'managingdirector@apecpowersolutions.com',
              'admin@apec.com'
            ].includes(m.email?.toLowerCase());

            return (
              <div key={m.id} className="p-6 rounded-2xl glass-card flex flex-col relative group hover:border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDocument('team', m.id, m.name)}
                    disabled={isDbActionLoading}
                    className="absolute top-4 right-4 p-1.5 text-slate-505 hover:text-rose-500 transition-colors rounded hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center text-sm font-bold text-slate-100 mb-4 shadow-sm">
                  {m.name.slice(0,2).toUpperCase()}
                </div>
                <h4 className="text-base font-bold text-slate-100 leading-snug">{m.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-rose-500 font-bold tracking-wide">{m.role}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                    isMemberAdmin
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  } border`}>
                    {isMemberAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2.5 truncate font-mono">{m.email}</p>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-505 font-semibold uppercase text-slate-500">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                    m.status === 'Site Visit' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25' :
                    'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                  }`}>
                    {m.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
