import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Loader2,
  Search,
  Phone,
  Briefcase,
  Calendar,
  Award,
  Shield,
  X
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Team() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  const getVerificationUrl = (profile: any) => {
    if (!profile) return '';
    const empId = (profile.employeeId && profile.employeeId !== 'undefined') ? profile.employeeId : profile.id;
    return `${window.location.origin}/profile/${empId}`;
  };

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
    const empIdMatch = m.employeeId?.toLowerCase().includes(term) || false;
    return nameMatch || emailMatch || roleMatch || deptMatch || skillMatch || empIdMatch;
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
            placeholder="Search name, role, department, skills..."
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
              <div key={m.id} onClick={() => setSelectedProfile(m)} className="p-6 rounded-2xl glass-card flex flex-col relative group hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument('team', m.id, m.name);
                    }}
                    disabled={isDbActionLoading}
                    className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded hover:bg-rose-955/20 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-sm" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarClass} border flex items-center justify-center text-sm font-bold shadow-sm`}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[9px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                      {m.employeeId || 'APEC-MEMBER'}
                    </span>
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

      {/* Profile Detail Drawer Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#070a13]/70 backdrop-blur-sm"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#070a13] border border-white/10 p-6 rounded-2xl shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                {selectedProfile.photoUrl ? (
                  <img src={selectedProfile.photoUrl} alt={selectedProfile.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-sm shrink-0" />
                ) : (
                  <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                    selectedProfile.avatar === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/25' :
                    selectedProfile.avatar === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25' :
                    selectedProfile.avatar === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-455 border-rose-500/25' :
                    'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
                  } border flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
                    {selectedProfile.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{selectedProfile.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-rose-500 font-bold">{selectedProfile.role}</span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-400 font-mono">
                      {selectedProfile.employeeId || 'APEC-MEMBER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* APEC Company ID Card */}
              <div className="relative w-full max-w-sm mx-auto rounded-2xl p-5 overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/40 backdrop-blur-md shadow-2xl flex flex-col gap-4 group hover:border-cyan-500/50 transition-all duration-300">
                {/* Subtle background grid */}
                <div className="absolute inset-0 cyber-grid opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">APEC Company ID</h5>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Operations Security</span>
                  </div>
                  <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border ${
                    selectedProfile.accessRole === 'Admin' || selectedProfile.roleType === 'Admin' || [
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedProfile.email?.toLowerCase())
                      ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  } font-mono`}>
                    {selectedProfile.accessRole === 'Admin' || selectedProfile.roleType === 'Admin' || [
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedProfile.email?.toLowerCase()) ? 'ADMIN ACCESS' : 'STAFF ACCESS'}
                  </span>
                </div>

                {/* Profile Avatar / Info */}
                <div className="flex items-center gap-3">
                  {selectedProfile.photoUrl ? (
                    <img src={selectedProfile.photoUrl} alt={selectedProfile.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0" />
                  ) : (
                    <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      selectedProfile.avatar === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20' :
                      selectedProfile.avatar === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20' :
                      selectedProfile.avatar === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20' :
                      'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20'
                    } border flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0`}>
                      {selectedProfile.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{selectedProfile.name}</h4>
                    <p className="text-[10px] text-rose-500 font-bold truncate leading-tight">{selectedProfile.role}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{selectedProfile.department || 'Operations'}</p>
                  </div>
                </div>

                {/* Employee ID footer */}
                <div className="border-t border-slate-800/60 pt-2.5 font-mono text-[9px] flex justify-between items-end">
                  <div>
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider">EMPLOYEE ID</span>
                    <span className="font-bold text-cyan-400">{selectedProfile.employeeId || 'APEC-MEMBER'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider">PROFILE LINK</span>
                    <span className="font-bold text-slate-300 text-[8px]">/profile/{selectedProfile.employeeId || selectedProfile.id}</span>
                  </div>
                </div>
              </div>

              {/* General details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Department</span>
                  <span className="text-slate-355 font-bold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.department || 'Operations'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedProfile.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    selectedProfile.status === 'Site Visit' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  } border`}>
                    {selectedProfile.status || 'Active'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Email Address</span>
                  <span className="text-slate-350 font-bold block truncate">{selectedProfile.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Phone Number</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.phone || 'N/A'}
                  </span>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-900/80 pt-2 mt-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Joined Date</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.joinedDate ? new Date(selectedProfile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-900/80 pt-2 flex justify-between items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Verification Link</span>
                    <a 
                      href={getVerificationUrl(selectedProfile)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-cyan-400 hover:underline font-bold text-[10px] block truncate"
                      title="Open Profile Page"
                    >
                      {getVerificationUrl(selectedProfile).replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getVerificationUrl(selectedProfile));
                      alert("Employee profile verification link copied to clipboard!");
                    }}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-900 hover:border-cyan-500/30 hover:text-cyan-400 text-slate-400 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer font-mono shrink-0"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Emergency & Medical Info */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Emergency & Medical Info</span>
                <div className="grid grid-cols-2 gap-4 text-xs bg-rose-955/5 p-4 rounded-xl border border-rose-500/10 font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Emergency Contact</span>
                    <span className="text-slate-200 font-bold block truncate">{selectedProfile.emergencyName || 'N/A'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Contact Phone</span>
                    <span className="text-slate-200 font-bold block truncate">{selectedProfile.emergencyPhone || 'N/A'}</span>
                  </div>
                  <div className="space-y-1 col-span-2 border-t border-slate-900/60 pt-2 mt-1 flex justify-between gap-6">
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Blood Group</span>
                      <span className="text-rose-455 font-bold flex items-center gap-1 text-rose-400">
                        <span className="text-[10px]">🩸</span> {selectedProfile.bloodGroup || 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Medical Notes</span>
                      <span className="text-slate-355 font-medium block truncate" title={selectedProfile.medicalConditions}>
                        {selectedProfile.medicalConditions || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call Emergency Contact & Secure Record details */}
                {selectedProfile.emergencyPhone && selectedProfile.emergencyPhone !== 'N/A' && (
                  <a
                    href={`tel:${selectedProfile.emergencyPhone}`}
                    className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs transition-all shadow-sm hover:shadow active:scale-[0.99] uppercase tracking-wider font-sans"
                  >
                    <Phone className="w-3.5 h-3.5 animate-pulse" />
                    Call Emergency Contact
                  </a>
                )}

                <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex items-center justify-center gap-2 text-slate-400 font-mono text-[9px] uppercase tracking-widest">
                  <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Secure Record · APEC Registry Verified</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Skills & Certifications</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                    selectedProfile.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-900 text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Award className="w-3 h-3 text-cyan-500" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-505 italic">No specialized skills/certifications listed</span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
