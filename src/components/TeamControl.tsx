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
  TrendingUp
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
  const [isAddingUser, setIsAddingUser] = useState(false);

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
      await addDoc(collection(db, 'team'), {
        name: newName,
        email: newEmail.trim(),
        role: newRole || 'Staff Member',
        accessRole: newAccessRole,
        status: newStatus
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Team member added',
        desc: `"${newName}" was registered as an ERP user with role "${newRole || 'Staff Member'}" (${newAccessRole})`,
        type: 'task',
        timestamp: Timestamp.now()
      });

      setNewName('');
      setNewEmail('');
      setNewRole('');
      setNewAccessRole('User');
      setNewStatus('Active');
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
            className="max-w-xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4">Register Operations Account</h4>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full bg-slate-955/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. rahul@apecpowersolutions.com"
                  required
                  className="w-full bg-slate-955/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Role Description</label>
                <input 
                  type="text" 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Safety Inspector, Lead Engineer"
                  className="w-full bg-slate-955/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Access Role (Priority)</label>
                  <select
                    value={newAccessRole}
                    onChange={(e) => setNewAccessRole(e.target.value)}
                    className="w-full bg-slate-955/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <option value="User" className="bg-slate-900 text-slate-100">User (Standard Access)</option>
                    <option value="Admin" className="bg-slate-900 text-slate-100">Admin (Full Control)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-955/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <option value="Active" className="bg-slate-900 text-slate-100">Active</option>
                    <option value="Site Visit" className="bg-slate-900 text-slate-100">Site Visit</option>
                    <option value="On Leave" className="bg-slate-900 text-slate-100">On Leave</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDbActionLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Team Member'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="user-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
          >
            {teamList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Users className="w-14 h-14 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">Database registry is empty</p>
                <p className="text-xs text-slate-500 mt-1">Populate users by clicking "Add Team Member".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/45 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role Description</th>
                      <th className="p-4">Access Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                    {teamList.map((m) => {
                      const isMemberAdmin = m.accessRole === 'Admin' || m.roleType === 'Admin' || [
                        'admin@apecpowersolutions.com',
                        'managingdirector@apecpowersolutions.com'
                      ].includes(m.email?.toLowerCase());

                      return (
                        <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-bold text-slate-100">{m.name}</td>
                          <td className="p-4 font-mono text-xs">{m.email}</td>
                          <td className="p-4 font-medium">{m.role}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isMemberAdmin 
                                ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            } border`}>
                              {isMemberAdmin ? (
                                <>
                                  <Shield className="w-3 h-3" />
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
                              m.status === 'Site Visit' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25' :
                              'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                            }`}>
                              {m.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
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
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded hover:bg-rose-950/20 disabled:opacity-30"
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
    </motion.div>
  );
}
