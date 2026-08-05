import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { 
  Shield, 
  Trash2, 
  Loader2, 
  ArrowRight, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function RolesPermissions() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userPermissions, rolesList } = useOutletContext<any>();

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState({
    viewDashboard: false,
    viewLiveTracking: false,
    viewLocationHistory: false,
    viewTeamControl: false,
    viewReports: false,
    viewSettings: false,
    manageSchedules: false,
    manageProjects: false,
    exportData: false
  });

  // Gatekeeping page view
  if (!isAdmin && !userPermissions?.viewTeamControl) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center h-[calc(100vh-250px)]">
        <div className="w-16 h-16 rounded-full bg-rose-955/20 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Restricted Operations Terminal</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
          Access denied. The Roles & Permissions console requires administrative credentials. Contact the managing director to configure access roles.
        </p>
      </div>
    );
  }

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !db) return;

    const lowercaseName = roleName.trim().toLowerCase();
    if (lowercaseName === 'admin' || lowercaseName === 'user' || rolesList.some((r: any) => r.name.toLowerCase() === lowercaseName)) {
      alert('Role name already exists or is reserved.');
      return;
    }

    setIsDbActionLoading(true);
    try {
      await addDoc(collection(db, 'roles'), {
        name: roleName.trim(),
        description: roleDesc.trim(),
        permissions: rolePermissions,
        createdAt: Timestamp.now()
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Custom role created',
        desc: `New security role "${roleName.trim()}" was created with custom permissions`,
        type: 'settings',
        timestamp: Timestamp.now()
      });

      setRoleName('');
      setRoleDesc('');
      setRolePermissions({
        viewDashboard: false,
        viewLiveTracking: false,
        viewLocationHistory: false,
        viewTeamControl: false,
        viewReports: false,
        viewSettings: false,
        manageSchedules: false,
        manageProjects: false,
        exportData: false
      });
      setIsAddingRole(false);
    } catch (err) {
      console.error('Error adding custom role:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!db) return;
    if (!window.confirm(`Are you sure you want to delete the role "${name}"? Users assigned to this role will lose their custom permissions.`)) return;

    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, 'roles', id));

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Custom role deleted',
        desc: `The security role "${name}" was deleted from the system`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error deleting role:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Roles & Permissions</h3>
          <p className="text-xs text-slate-400 mt-1">Configure security roles and granular module access control</p>
        </div>

        {!isAddingRole ? (
          <button 
            type="button"
            onClick={() => setIsAddingRole(true)}
            disabled={isDbActionLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            Create Custom Role
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => setIsAddingRole(false)}
            disabled={isDbActionLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            Back to Roles
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAddingRole ? (
          <motion.div 
            key="role-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-2xl glass-card p-6 rounded-[2rem] relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Create Custom Security Role
            </h4>
            <form onSubmit={handleAddRole} className="space-y-6">
              <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  Role Details
                </h5>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Role Name</label>
                    <input 
                      type="text" 
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g. Supervisor, Project Coordinator"
                      required
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Description</label>
                    <input 
                      type="text" 
                      value={roleDesc}
                      onChange={(e) => setRoleDesc(e.target.value)}
                      placeholder="e.g. Can view dispatches and location telemetry"
                      className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  Permissions Checklist
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'viewDashboard', label: 'View Dashboard Overview' },
                    { key: 'viewLiveTracking', label: 'View Live Tracking Map' },
                    { key: 'viewLocationHistory', label: 'View Location History' },
                    { key: 'viewTeamControl', label: 'Access Team Control' },
                    { key: 'viewReports', label: 'Access Reports Tab' },
                    { key: 'viewSettings', label: 'Access Settings Tab' },
                    { key: 'manageSchedules', label: 'Manage Schedules / Dispatches' },
                    { key: 'manageProjects', label: 'Manage Projects' },
                    { key: 'exportData', label: 'Export Analytics Data' }
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-905/30 hover:border-slate-800 cursor-pointer select-none transition-all">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions as any)[perm.key]}
                        onChange={(e) => setRolePermissions(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-300">
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-4">
                <button
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isDbActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Role</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingRole(false)}
                  className="w-full py-3.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="roles-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: 'system-admin',
                  name: 'Admin',
                  description: 'Default System Administrator. Full unrestricted access.',
                  isSystem: true,
                  permissions: {
                    viewDashboard: true,
                    viewLiveTracking: true,
                    viewLocationHistory: true,
                    viewTeamControl: true,
                    viewReports: true,
                    viewSettings: true,
                    manageSchedules: true,
                    manageProjects: true,
                    exportData: true
                  }
                },
                {
                  id: 'system-user',
                  name: 'User',
                  description: 'Default Staff / Technician role. Basic attendance tracking and profiles.',
                  isSystem: true,
                  permissions: {
                    viewDashboard: false,
                    viewLiveTracking: false,
                    viewLocationHistory: false,
                    viewTeamControl: false,
                    viewReports: false,
                    viewSettings: false,
                    manageSchedules: false,
                    manageProjects: false,
                    exportData: false
                  }
                },
                ...rolesList
              ].map((role) => {
                const enabledPerms = Object.entries(role.permissions || {})
                  .filter(([_, val]) => val === true)
                  .map(([key]) => {
                    const mappings: Record<string, string> = {
                      viewDashboard: 'Dashboard Overview',
                      viewLiveTracking: 'Live Tracking Map',
                      viewLocationHistory: 'Location History',
                      viewTeamControl: 'Team Control',
                      viewReports: 'Reports Tab',
                      viewSettings: 'Settings Tab',
                      manageSchedules: 'Manage Schedules',
                      manageProjects: 'Manage Projects',
                      exportData: 'Export Analytics'
                    };
                    return mappings[key] || key;
                  });

                return (
                  <div key={role.id} className="relative p-6 rounded-2xl glass-card border border-white/5 flex flex-col justify-between hover:border-cyan-500/20 transition-all duration-300">
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        disabled={isDbActionLoading}
                        className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded hover:bg-rose-955/20 disabled:opacity-50 cursor-pointer"
                        title="Delete Custom Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className={`w-4 h-4 ${role.isSystem ? 'text-cyan-400' : 'text-indigo-400'}`} />
                        <h4 className="text-base font-bold text-slate-100">{role.name}</h4>
                        {role.isSystem && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                            System Role
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-4">{role.description || 'No description provided.'}</p>
                    </div>

                    <div className="border-t border-slate-900/60 pt-4 mt-auto">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Active Permissions</span>
                      {enabledPerms.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No administrative permissions granted.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {enabledPerms.map((permLabel, pIdx) => (
                            <span key={pIdx} className="px-2 py-0.5 rounded bg-cyan-955/20 border border-cyan-500/10 text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
                              {permLabel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
