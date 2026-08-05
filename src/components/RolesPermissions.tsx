import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { 
  Shield, 
  Trash2, 
  Loader2, 
  Check, 
  ShieldAlert,
  LayoutDashboard,
  Map,
  History,
  FileText,
  Settings,
  Calendar,
  Activity,
  Download,
  Plus,
  X
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function RolesPermissions() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userPermissions, rolesList } = useOutletContext<any>();

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({
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

  // Permission definition with labels, descriptions, and icons
  const permissionsList = [
    { key: 'viewDashboard', label: 'Dashboard Overview', desc: 'View general analytics & staff stats', icon: LayoutDashboard },
    { key: 'viewLiveTracking', label: 'Live Tracking Map', desc: 'See active staff current coordinates', icon: Map },
    { key: 'viewLocationHistory', label: 'Location History', desc: 'Lookup breadcrumb route telemetry', icon: History },
    { key: 'viewTeamControl', label: 'Access Team Control', desc: 'Manage credentials & access priorities', icon: Shield },
    { key: 'viewReports', label: 'Access Reports Tab', desc: 'Access log details & export downloads', icon: FileText },
    { key: 'viewSettings', label: 'Access Settings Tab', desc: 'Configure global system parameters', icon: Settings },
    { key: 'manageSchedules', label: 'Manage Schedules', desc: 'Assign dispatches & verification runs', icon: Calendar },
    { key: 'manageProjects', label: 'Manage Projects', desc: 'Modify coordinates & installation statuses', icon: Activity },
    { key: 'exportData', label: 'Export Analytics Data', desc: 'Generate CSV / PDF download reports', icon: Download }
  ];

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

  const togglePermission = (key: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Roles & Permissions</h3>
          <p className="text-xs text-slate-400 mt-1">Configure security roles and granular module access control</p>
        </div>

        <button 
          type="button"
          onClick={() => setIsAddingRole(true)}
          disabled={isDbActionLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Custom Role
        </button>
      </div>

      {/* Main grid layout for existing roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              const matchingPerm = permissionsList.find(p => p.key === key);
              return {
                label: matchingPerm?.label || key,
                icon: matchingPerm?.icon || Shield
              };
            });

          return (
            <div 
              key={role.id} 
              className="relative p-6 rounded-[2rem] glass-card border border-white/5 flex flex-col justify-between hover:border-cyan-500/20 hover:shadow-[0_8px_30px_rgba(6,182,212,0.05)] transition-all duration-300 group"
            >
              {!role.isSystem && (
                <button
                  onClick={() => handleDeleteRole(role.id, role.name)}
                  disabled={isDbActionLoading}
                  className="absolute top-5 right-5 p-2 text-slate-500 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-955/20 disabled:opacity-50 cursor-pointer"
                  title="Delete Custom Role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    role.isSystem ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      {role.name}
                      {role.isSystem && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                          System
                        </span>
                      )}
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed min-h-[36px]">{role.description || 'No description provided.'}</p>
              </div>

              <div className="border-t border-slate-900/60 pt-4 mt-auto">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2.5">Active Modules</span>
                {enabledPerms.length === 0 ? (
                  <span className="text-xs text-slate-500 italic block py-1">No administrative permissions granted.</span>
                ) : enabledPerms.length === permissionsList.length ? (
                  <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5 py-1">
                    <Check className="w-4 h-4 text-cyan-500" />
                    Full Unrestricted Privileges
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPerms.map((perm, pIdx) => (
                      <span 
                        key={pIdx} 
                        className="px-2 py-1 rounded-xl bg-cyan-955/20 border border-cyan-500/10 text-[10px] font-semibold text-cyan-455 flex items-center gap-1"
                      >
                        <perm.icon className="w-3 h-3 text-cyan-500 shrink-0" />
                        {perm.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Creation Popup Modal */}
      <AnimatePresence>
        {isAddingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glassmorphic backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setIsAddingRole(false)}
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl glass-card p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsAddingRole(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-slate-950/40 hover:bg-slate-900 border border-slate-800/80 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <h4 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Create Custom Security Role
              </h4>

              <form onSubmit={handleAddRole} className="space-y-6">
                <div className="space-y-4 p-4 bg-slate-955/10 rounded-[1.5rem] border border-white/5">
                  <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-2 mb-3">
                    Role details
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-4 p-4 bg-slate-955/10 rounded-[1.5rem] border border-white/5">
                  <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-2 mb-3">
                    Permissions configuration
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {permissionsList.map((perm) => {
                      const isActive = rolePermissions[perm.key];
                      const Icon = perm.icon;
                      return (
                        <div 
                          key={perm.key} 
                          onClick={() => togglePermission(perm.key)}
                          className={`flex items-start gap-3.5 p-3.5 rounded-[1.25rem] border cursor-pointer select-none transition-all duration-300 ${
                            isActive 
                              ? 'bg-cyan-500/10 border-cyan-500/35 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                              : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400' : 'bg-slate-900 border-slate-850 text-slate-500'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <span className={`text-xs font-bold block transition-colors ${
                              isActive ? 'text-slate-100' : 'text-slate-400'
                            }`}>
                              {perm.label}
                            </span>
                            <span className="text-[9px] text-slate-500 leading-normal block">
                              {perm.desc}
                            </span>
                          </div>
                          
                          <div className="pt-0.5">
                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              isActive ? 'bg-cyan-500 text-slate-950 scale-100' : 'bg-slate-900 border border-slate-800 scale-95'
                            }`}>
                              {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
