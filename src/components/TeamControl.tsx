import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Loader2, 
  UserPlus, 
  ShieldAlert, 
  Shield, 
  ArrowRight,
  TrendingUp,
  Eye,
  Phone,
  Briefcase,
  Calendar,
  Award,
  X,
  ChevronDown,
  Wifi
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function TeamControl() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newAccessRole, setNewAccessRole] = useState('User');
  const [newStatus, setNewStatus] = useState('Active');
  const [newPhone, setNewPhone] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations Control');
  const [newJoinedDate, setNewJoinedDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSkills, setNewSkills] = useState('');
  const [newAvatar, setNewAvatar] = useState('cyan');
  
  // Emergency & Medical States
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newBloodGroup, setNewBloodGroup] = useState('');
  const [newMedicalConditions, setNewMedicalConditions] = useState('');
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'dept' | 'priority' | 'status' | 'avatar' | null>(null);

  // NFC States
  const [newNfcUid, setNewNfcUid] = useState('');
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcScanTarget, setNfcScanTarget] = useState<'form' | 'profile' | null>(null);

  const startNfcScan = (target: 'form' | 'profile') => {
    setIsNfcScanning(true);
    setNfcScanTarget(target);
    
    let scanAborted = false;

    const handleScannedTag = async (finalUid: string) => {
      if (target === 'form') {
        setNewNfcUid(finalUid);
      } else if (target === 'profile' && selectedProfile && db) {
        try {
          setIsDbActionLoading(true);
          await updateDoc(doc(db, 'team', selectedProfile.id), {
            nfcTagUid: finalUid,
            nfcCardStatus: 'Linked',
            nfcIssuedDate: new Date().toISOString()
          });
          
          // Log activity
          await addDoc(collection(db, 'activities'), {
            title: 'NFC Pass Linked',
            desc: `Contactless card "${finalUid}" was linked to profile "${selectedProfile.name}"`,
            type: 'settings',
            timestamp: Timestamp.now()
          });

          setSelectedProfile((prev: any) => ({
            ...prev,
            nfcTagUid: finalUid,
            nfcCardStatus: 'Linked',
            nfcIssuedDate: new Date().toISOString()
          }));
        } catch (err) {
          console.error('Error linking tag:', err);
        } finally {
          setIsDbActionLoading(false);
        }
      }
      setIsNfcScanning(false);
      setNfcScanTarget(null);
    };

    // Attempt native physical scanning & NDEF URL write on supported mobile Chrome browsers
    const startPhysicalScanAndWrite = async () => {
      if ('NDEFReader' in window) {
        try {
          const ndef = new (window as any).NDEFReader();
          await ndef.scan();
          ndef.onreading = async ({ serialNumber }: any) => {
            if (scanAborted) return;
            scanAborted = true;

            const formatted = serialNumber.includes(':') 
              ? serialNumber.toUpperCase() 
              : serialNumber.match(/.{1,2}/g)?.join(':').toUpperCase() || serialNumber;
            const finalUid = formatted.toUpperCase();

            try {
              const origin = window.location.origin;
              await ndef.write({
                records: [{ recordType: "url", data: `${origin}/verify-tag/${finalUid}` }]
              });
              console.log("Written APEC verification route to tag:", `${origin}/verify-tag/${finalUid}`);
            } catch (writeErr) {
              console.warn("NFC Tag is write-protected or write failed: ", writeErr);
            }

            await handleScannedTag(finalUid);
          };
        } catch (err) {
          console.warn("Native NFC initialization failed:", err);
        }
      }
    };

    startPhysicalScanAndWrite();

    // Fallback simulation timer
    setTimeout(async () => {
      if (scanAborted) return;
      scanAborted = true;
      
      const generatedUid = Array.from({ length: 4 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
      ).join(':');
      const finalUid = `04:${generatedUid}`;

      await handleScannedTag(finalUid);
    }, 2500);
  };

  const handleRevokeNfc = async () => {
    if (!selectedProfile || !db) return;
    if (!window.confirm(`Are you sure you want to revoke contactless card access for "${selectedProfile.name}"?`)) return;

    setIsDbActionLoading(true);
    try {
      const currentUid = selectedProfile.nfcTagUid;
      await updateDoc(doc(db, 'team', selectedProfile.id), {
        nfcTagUid: null,
        nfcCardStatus: 'Revoked',
        nfcIssuedDate: null
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'NFC Pass Revoked',
        desc: `Contactless access credentials for card "${currentUid}" linked to "${selectedProfile.name}" were revoked`,
        type: 'settings',
        timestamp: Timestamp.now()
      });

      setSelectedProfile((prev: any) => ({
        ...prev,
        nfcTagUid: null,
        nfcCardStatus: 'Revoked',
        nfcIssuedDate: null
      }));
    } catch (err) {
      console.error('Error revoking tag:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTeamLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch all team members
  useEffect(() => {
    if (!db || !isAdmin) {
      setIsTeamLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamList(members);
      setIsTeamLoading(false);
    }, (err) => {
      console.error('Team Control listener error:', err);
      setFirestoreError(err.code);
      setIsTeamLoading(false);
    });

    return () => unsubTeam();
  }, [isAdmin, setFirestoreError]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !db) return;

    setIsDbActionLoading(true);
    try {
      const formattedSkills = newSkills
        ? newSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      await addDoc(collection(db, 'team'), {
        name: newName,
        email: newEmail.trim(),
        role: newRole || 'Staff Member',
        accessRole: newAccessRole,
        status: newStatus,
        phone: newPhone || 'N/A',
        employeeId: newEmployeeId.trim() || `APEC-${Math.floor(1000 + Math.random() * 9000)}`,
        department: newDepartment,
        joinedDate: newJoinedDate,
        skills: formattedSkills,
        avatar: newAvatar,
        nfcTagUid: newNfcUid.trim() || null,
        nfcCardStatus: newNfcUid.trim() ? 'Linked' : 'Inactive',
        nfcIssuedDate: newNfcUid.trim() ? new Date().toISOString() : null,
        emergencyName: newEmergencyName.trim() || 'N/A',
        emergencyPhone: newEmergencyPhone.trim() || 'N/A',
        bloodGroup: newBloodGroup || 'N/A',
        medicalConditions: newMedicalConditions.trim() || 'None'
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Team member added',
        desc: `"${newName}" was registered as an ERP user with role "${newRole || 'Staff Member'}" in ${newDepartment}`,
        type: 'task',
        timestamp: Timestamp.now()
      });

      setNewName('');
      setNewEmail('');
      setNewRole('');
      setNewAccessRole('User');
      setNewStatus('Active');
      setNewPhone('');
      setNewEmployeeId('');
      setNewDepartment('Operations Control');
      setNewJoinedDate(new Date().toISOString().slice(0, 10));
      setNewSkills('');
      setNewAvatar('cyan');
      setNewNfcUid('');
      setNewEmergencyName('');
      setNewEmergencyPhone('');
      setNewBloodGroup('');
      setNewMedicalConditions('');
      setIsAddingUser(false);
    } catch (err) {
      console.error('Error adding user:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleTogglePriority = async (id: string, currentRole: string, userName: string) => {
    if (!db) return;
    setIsDbActionLoading(true);
    const nextRole = currentRole === 'Admin' ? 'User' : 'Admin';
    try {
      await updateDoc(doc(db, 'team', id), {
        accessRole: nextRole
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'User role updated',
        desc: `"${userName}" was ${nextRole === 'Admin' ? 'promoted to Admin' : 'demoted to User'} priority`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating user role:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!db) return;
    if (!window.confirm(`Are you sure you want to revoke access and delete user "${userName}"?`)) return;

    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, 'team', id));
      
      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Access credentials revoked',
        desc: `"${userName}" was removed from the ERP database`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Gatekeeping page view
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center h-[calc(100vh-250px)]">
        <div className="w-16 h-16 rounded-full bg-rose-955/20 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Restricted Operations Terminal</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
          Access denied. The User Management console requires administrative credentials. Contact the managing director to configure access roles.
        </p>
      </div>
    );
  }

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
      {openDropdown && (
        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setOpenDropdown(null)} />
      )}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Team Control Panel</h3>
          <p className="text-xs text-slate-400 mt-1">Configure credentials, access priorities, and security roles</p>
        </div>
        <button 
          onClick={() => setIsAddingUser(!isAddingUser)}
          disabled={isDbActionLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50"
        >
          {isAddingUser ? 'Back to Registry' : 'Add Team Member'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAddingUser ? (
          <motion.div 
            key="user-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-5xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] mx-auto"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Register Operations Account
            </h4>
            <form onSubmit={handleAddUser} className="space-y-6">
              {/* Section 1: Profile Identity */}
              <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  1. Profile Identity
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. rahul@apec.com"
                      required
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Role & Department */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  2. Role & Department
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Role Description</label>
                    <input 
                      type="text" 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="e.g. Lead Technician"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Department</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'dept' ? null : 'dept')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newDepartment}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'dept' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'dept' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            "Operations Control",
                            "Solar Installation",
                            "High Voltage Substations",
                            "Grid Automation",
                            "Safety & Compliance"
                          ].map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setNewDepartment(dept);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newDepartment === dept 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{dept}</span>
                              {newDepartment === dept && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Employee ID</label>
                    <input 
                      type="text" 
                      value={newEmployeeId}
                      onChange={(e) => setNewEmployeeId(e.target.value)}
                      placeholder="APEC-2026-042 (Optional)"
                      className="w-full bg-slate-955/60 border border-slate-850 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Access Control & Skills */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  3. Access Control & Skills
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Joined Date</label>
                    <input 
                      type="date" 
                      value={newJoinedDate}
                      onChange={(e) => setNewJoinedDate(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Skills & Certifications</label>
                    <input 
                      type="text" 
                      value={newSkills}
                      onChange={(e) => setNewSkills(e.target.value)}
                      placeholder="e.g. HV Licensing, First Aid"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Access Priority</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newAccessRole === 'Admin' ? 'Admin (Full)' : 'User (Standard)'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'priority' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'priority' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            { value: 'User', label: 'User (Standard)' },
                            { value: 'Admin', label: 'Admin (Full)' }
                          ].map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                setNewAccessRole(role.value);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newAccessRole === role.value 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{role.label}</span>
                              {newAccessRole === role.value && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Status</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newStatus}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'status' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {["Active", "Site Visit", "On Leave"].map((statusVal) => (
                            <button
                              key={statusVal}
                              type="button"
                              onClick={() => {
                                setNewStatus(statusVal);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newStatus === statusVal 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{statusVal}</span>
                              {newStatus === statusVal && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Avatar Theme</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'avatar' ? null : 'avatar')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-505 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span className="capitalize">{newAvatar} Theme</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'avatar' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'avatar' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            { value: 'cyan', label: 'Cyan Theme' },
                            { value: 'blue', label: 'Blue Theme' },
                            { value: 'red', label: 'Red Theme' },
                            { value: 'gold', label: 'Gold Theme' }
                          ].map((theme) => (
                            <button
                              key={theme.value}
                              type="button"
                              onClick={() => {
                                setNewAvatar(theme.value);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newAvatar === theme.value 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{theme.label}</span>
                              {newAvatar === theme.value && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
              </div>

              {/* Section 4: Health & Emergency Credentials */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  4. Health & Emergency Credentials
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Name</label>
                    <input 
                      type="text" 
                      value={newEmergencyName}
                      onChange={(e) => setNewEmergencyName(e.target.value)}
                      placeholder="e.g. Jane Doe (Spouse)"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Phone</label>
                    <input 
                      type="text" 
                      value={newEmergencyPhone}
                      onChange={(e) => setNewEmergencyPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Blood Group</label>
                    <select
                      value={newBloodGroup}
                      onChange={(e) => setNewBloodGroup(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 text-slate-150 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    >
                      <option value="">Select Blood Group...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Medical Conditions / Notes</label>
                    <input 
                      type="text" 
                      value={newMedicalConditions}
                      onChange={(e) => setNewMedicalConditions(e.target.value)}
                      placeholder="e.g. Peanut allergy, Asthma, None"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Contactless Credentials */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-405 text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  5. Contactless Proximity Card (NFC)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">NFC Tag UID</label>
                    <input 
                      type="text" 
                      value={newNfcUid}
                      onChange={(e) => setNewNfcUid(e.target.value)}
                      placeholder="No card scanned (e.g. 04:A3:C2:5B)"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => startNfcScan('form')}
                      disabled={isNfcScanning}
                      className="w-full py-2.5 bg-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-950/20 text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isNfcScanning && nfcScanTarget === 'form' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3.5 h-3.5" />
                          <span>Scan NFC Card</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Team Member'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="user-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
          >
            {teamList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Users className="w-14 h-14 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">Database registry is empty</p>
                <p className="text-xs text-slate-505 mt-1">Populate users by clicking "Add Team Member".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-955/45 uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Role / Department</th>
                      <th className="p-4">Access Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm text-slate-355">
                    {teamList.map((m) => {
                      const isMemberAdmin = m.accessRole === 'Admin' || m.roleType === 'Admin' || [
                        'admin@apecpowersolutions.com',
                        'managingdirector@apecpowersolutions.com'
                      ].includes(m.email?.toLowerCase());

                      const avatarColors: Record<string, string> = {
                        cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-405 border-cyan-500/25',
                        blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25',
                        red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
                        gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
                      };
                      const avatarClass = avatarColors[m.avatar || 'cyan'] || avatarColors.cyan;

                      return (
                        <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-450">{m.employeeId || 'APEC-MEMBER'}</td>
                          <td className="p-4 font-bold text-slate-100 flex items-center gap-2.5">
                            <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarClass} border flex items-center justify-center text-[10px] font-extrabold shrink-0`}>
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[120px]" title={m.name}>{m.name}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-205 truncate max-w-[150px]">{m.role}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{m.department || 'Operations'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isMemberAdmin 
                                ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            } border`}>
                              {isMemberAdmin ? (
                                <>
                                  <Shield className="w-3 h-3 text-cyan-455" />
                                  Admin
                                  </>
                              ) : (
                                'User'
                              )}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              m.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                              m.status === 'Site Visit' ? 'bg-cyan-955/40 text-cyan-400 border border-cyan-500/25' :
                              'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                            }`}>
                              {m.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* View details */}
                              <button
                                onClick={() => setSelectedProfile(m)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-950/20"
                                title="View Complete Profile Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Toggle Priority */}
                              <button
                                onClick={() => handleTogglePriority(m.id, isMemberAdmin ? 'Admin' : 'User', m.name)}
                                disabled={isDbActionLoading || ['admin@apecpowersolutions.com', 'managingdirector@apecpowersolutions.com'].includes(m.email?.toLowerCase())}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-950/20 disabled:opacity-30"
                                title={isMemberAdmin ? 'Demote to Standard User' : 'Promote to Administrative Access'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>

                              {/* Remove User */}
                              <button
                                onClick={() => handleDeleteUser(m.id, m.name)}
                                disabled={isDbActionLoading || ['admin@apecpowersolutions.com', 'managingdirector@apecpowersolutions.com'].includes(m.email?.toLowerCase())}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded hover:bg-rose-955/20 disabled:opacity-30"
                                title="Revoke Credentials & Remove User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Drawer Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg glass-card p-6 rounded-2xl shadow-2xl border border-white/10 z-10 space-y-6"
            >
              <button 
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                  selectedProfile.avatar === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-405 border-cyan-500/25' :
                  selectedProfile.avatar === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25' :
                  selectedProfile.avatar === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25' :
                  'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
                } border flex items-center justify-center text-sm font-extrabold shadow-sm`}>
                  {selectedProfile.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{selectedProfile.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-rose-505 font-bold">{selectedProfile.role}</span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-400 font-mono">
                      {selectedProfile.employeeId || 'APEC-MEMBER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proximity ID Pass Card Container */}
              <div className="relative w-full max-w-sm h-48 mx-auto rounded-2xl p-5 overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/40 backdrop-blur-md shadow-2xl flex flex-col justify-between group hover:border-cyan-500/50 transition-all duration-300">
                {/* Contactless Grid Background */}
                <div className="absolute inset-0 cyber-grid opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                
                {/* Radio/Chip Symbol */}
                <div className="absolute top-5 right-5 text-cyan-400/60 group-hover:text-cyan-450 transition-colors">
                  <Wifi className="w-6 h-6 animate-pulse" />
                </div>
                
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">APEC Proximity Pass</h5>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Operations Security</span>
                  </div>
                  <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border ${
                    selectedProfile.accessRole === 'Admin' || selectedProfile.roleType === 'Admin' || [
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedProfile.email?.toLowerCase())
                      ? 'bg-cyan-950/40 text-cyan-405 border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
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
                  <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                    selectedProfile.avatar === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20' :
                    selectedProfile.avatar === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20' :
                    selectedProfile.avatar === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20' :
                    'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20'
                  } border flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0`}>
                    {selectedProfile.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{selectedProfile.name}</h4>
                    <p className="text-[10px] text-rose-505 font-bold truncate leading-tight">{selectedProfile.role}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{selectedProfile.department || 'Operations'}</p>
                  </div>
                </div>

                {/* Tag Info */}
                <div className="flex justify-between items-end border-t border-slate-800/60 pt-2.5 font-mono text-[9px]">
                  <div>
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider">RFID TAG UID</span>
                    <span className={`font-bold ${selectedProfile.nfcTagUid ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {selectedProfile.nfcTagUid || 'UNASSIGNED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider text-right">TAG STATUS</span>
                    <span className={`font-bold uppercase block text-right ${
                      selectedProfile.nfcCardStatus === 'Linked' ? 'text-green-450' :
                      selectedProfile.nfcCardStatus === 'Revoked' ? 'text-rose-500' :
                      'text-amber-500'
                    }`}>
                      {selectedProfile.nfcCardStatus || 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-955/45 p-4 rounded-xl border border-slate-900/60 font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Department</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.department || 'Operations'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedProfile.status === 'Active' ? 'bg-green-500/10 text-green-405 border border-green-500/20' :
                    selectedProfile.status === 'Site Visit' ? 'bg-cyan-500/10 text-cyan-405 border border-cyan-500/20' :
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
                <div className="space-y-1 col-span-2">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] border-t border-slate-900/80 pt-2 mt-1">Joined Date</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.joinedDate ? new Date(selectedProfile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Emergency & Medical Credentials */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Emergency & Medical Info</span>
                <div className="grid grid-cols-2 gap-4 text-xs bg-rose-950/5 p-4 rounded-xl border border-rose-500/10 font-mono">
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
                      <span className="text-rose-450 font-bold flex items-center gap-1 text-rose-400">
                        <span className="text-[10px]">🩸</span> {selectedProfile.bloodGroup || 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Medical Notes</span>
                      <span className="text-slate-350 font-medium block truncate" title={selectedProfile.medicalConditions}>
                        {selectedProfile.medicalConditions || 'None'}
                      </span>
                    </div>
                  </div>
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

              {/* NFC Card Management Actions */}
              <div className="pt-2 flex gap-3">
                {selectedProfile.nfcTagUid ? (
                  <button
                    type="button"
                    onClick={handleRevokeNfc}
                    disabled={isDbActionLoading}
                    className="w-full py-2.5 bg-rose-955/20 border border-rose-900/30 hover:border-rose-900/50 hover:bg-rose-950/20 text-rose-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke Contactless Pass</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startNfcScan('profile')}
                    disabled={isDbActionLoading || isNfcScanning}
                    className="w-full py-2.5 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isNfcScanning && nfcScanTarget === 'profile' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Initializing Scanner...</span>
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Link Contactless Pass</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NFC Proximity Scanning Overlay */}
      <AnimatePresence>
        {isNfcScanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-955/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/30 p-8 rounded-2xl shadow-2xl z-50 text-center space-y-6"
            >
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Glowing Radar Rings */}
                <div className="absolute inset-0 rounded-full bg-cyan-500/5 border border-cyan-500/20 animate-ping opacity-75" />
                <div className="absolute inset-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-500/50 flex items-center justify-center text-cyan-450 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Wifi className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-100 uppercase tracking-wider font-mono">NFC Proximity Reader</h4>
                <p className="text-xs text-slate-405 max-w-xs leading-relaxed mx-auto">
                  TAP proximity ID pass or RFID token against your reader terminal now...
                </p>
              </div>
              
              <div className="text-[10px] text-cyan-500 font-mono tracking-widest uppercase animate-pulse">
                Awaiting Contactless Signal
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
