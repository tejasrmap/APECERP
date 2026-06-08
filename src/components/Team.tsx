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
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

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
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-[#0e2a47]" />
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
        <h3 className="text-xl font-bold text-slate-900">Engineering Team</h3>
        <p className="text-xs text-slate-500 mt-1">Registered technicians, safety personnel, and managers</p>
      </div>

      {teamList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center flex flex-col items-center shadow-sm">
          <Users className="w-14 h-14 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No team members registered</p>
          <p className="text-xs text-slate-400 mt-1">Populate profiles using Seeding settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamList.map((m) => (
            <div key={m.id} className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col relative group hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
              <button
                onClick={() => handleDeleteDocument('team', m.id, m.name)}
                disabled={isDbActionLoading}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 mb-4 shadow-sm">
                {m.name.slice(0,2).toUpperCase()}
              </div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">{m.name}</h4>
              <p className="text-xs text-red-650 font-semibold mt-0.5">{m.role}</p>
              <p className="text-xs text-slate-500 mt-2 truncate font-mono">{m.email}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  m.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                  m.status === 'Site Visit' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
                  'bg-amber-50 text-amber-700 border border-amber-200/50'
                }`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
