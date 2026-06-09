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
  X
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
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

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
        avatar: newAvatar
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Department</label>
                    <select
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10"
                    >
                      <option value="Operations Control" className="bg-slate-900 text-slate-100">Operations Control</option>
                      <option value="Solar Installation" className="bg-slate-900 text-slate-100">Solar Installation</option>
                      <option value="High Voltage Substations" className="bg-slate-900 text-slate-100">High Voltage Substations</option>
                      <option value="Grid Automation" className="bg-slate-900 text-slate-100">Grid Automation</option>
                      <option value="Safety & Compliance" className="bg-slate-900 text-slate-100">Safety & Compliance</option>
                    </select>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Access Priority</label>
                    <select
                      value={newAccessRole}
                      onChange={(e) => setNewAccessRole(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10"
                    >
                      <option value="User" className="bg-slate-900 text-slate-100">User (Standard)</option>
                      <option value="Admin" className="bg-slate-900 text-slate-100">Admin (Full)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10"
                    >
                      <option value="Active" className="bg-slate-900 text-slate-100">Active</option>
                      <option value="Site Visit" className="bg-slate-900 text-slate-100">Site Visit</option>
                      <option value="On Leave" className="bg-slate-900 text-slate-100">On Leave</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Avatar Theme</label>
                    <select
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-505 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10"
                    >
                      <option value="cyan" className="bg-slate-900 text-slate-100">Cyan Theme</option>
                      <option value="blue" className="bg-slate-900 text-slate-100">Blue Theme</option>
                      <option value="red" className="bg-slate-900 text-slate-100">Red Theme</option>
                      <option value="gold" className="bg-slate-900 text-slate-100">Gold Theme</option>
                    </select>
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
                <span className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                  selectedProfile.avatar === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20' :
                  selectedProfile.avatar === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20' :
                  selectedProfile.avatar === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20' :
                  'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20'
                } border flex items-center justify-center text-xl font-extrabold shadow-sm`}>
                  {selectedProfile.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{selectedProfile.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-rose-505 font-bold">{selectedProfile.role}</span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-400 font-mono">
                      {selectedProfile.employeeId || 'APEC-MEMBER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/45 p-4 rounded-xl border border-slate-900/60 font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Department</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.department || 'Operations'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                <div className="space-y-1 col-span-2">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px] border-t border-slate-900/80 pt-2 mt-1">Joined Date</span>
                  <span className="text-slate-350 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    {selectedProfile.joinedDate ? new Date(selectedProfile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
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
