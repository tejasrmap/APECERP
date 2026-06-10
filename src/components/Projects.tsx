import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Projects() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Gantt / Milestones States
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);

  const milestonesList = [
    'Site Audit & Clearance',
    'Material Allocation & Dispatch',
    'Electrical Wiring & Integration',
    'Safety Verification & LOTO Check',
    'System Commissioning & Grid Sync'
  ];

  const handleToggleMilestone = async (project: any, milestoneName: string) => {
    const currentList = project.completedMilestones || [];
    const nextList = currentList.includes(milestoneName)
      ? currentList.filter((m: string) => m !== milestoneName)
      : [...currentList, milestoneName];

    // If no db, just update state locally
    if (!db) {
      setProjectsList(prev => prev.map(p => p.id === project.id ? { ...p, completedMilestones: nextList } : p));
      return;
    }

    setIsDbActionLoading(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        completedMilestones: nextList
      });
    } catch (err) {
      console.error('Error updating milestone:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('Active');
  const [newProjectSite, setNewProjectSite] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProjectsLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Pradeep Moses Mathi', role: 'Managing Director' },
        { id: '2', name: 'Teja Ganugula', role: 'Team Member' },
        { id: '3', name: 'GT InnoX LLP', role: 'Technical Partner' }
      ]);
      setIsProjectsLoading(false);
      return;
    }

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(projs);
      setIsProjectsLoading(false);
    }, (err) => {
      console.error('Projects listener error:', err);
      setFirestoreError(err.code);
      setIsProjectsLoading(false);
    });

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      setTeamList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Team load error in Projects:', err);
    });

    return () => {
      unsubProjects();
      unsubTeam();
    };
  }, [setFirestoreError]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !db) return;
    setIsDbActionLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        status: newProjectStatus,
        site: newProjectSite || 'General Site',
        manager: newProjectManager || 'Unassigned'
      });
      // Add activity
      await addDoc(collection(db, 'activities'), {
        title: 'New project registered',
        desc: `Project "${newProjectName}" was added under ${newProjectSite || 'General Site'}`,
        type: 'task',
        timestamp: Timestamp.now()
      });
      setNewProjectName('');
      setNewProjectSite('');
      setNewProjectManager('');
      setIsAddingProject(false);
    } catch (err) {
      console.error('Error adding project:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

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

  if (isProjectsLoading) {
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
          <h3 className="text-xl font-bold text-slate-100">Project Directory</h3>
          <p className="text-xs text-slate-400 mt-1">APEC active and pipeline installations</p>
        </div>
        <button 
          onClick={() => setIsAddingProject(!isAddingProject)}
          disabled={isDbActionLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50"
        >
          {isAddingProject ? <ArrowLeft className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAddingProject ? 'Back to List' : 'Add Project'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAddingProject ? (
          <motion.div 
            key="project-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4">Register New APEC Installation</h4>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Grid Substation Hubli"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <option value="Active" className="bg-slate-900 text-slate-100">Active</option>
                    <option value="Pending" className="bg-slate-900 text-slate-100">Pending</option>
                    <option value="Completed" className="bg-slate-900 text-slate-100">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Location Site</label>
                  <input 
                    type="text" 
                    value={newProjectSite}
                    onChange={(e) => setNewProjectSite(e.target.value)}
                    placeholder="e.g. Site A"
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Project Manager</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-sm cursor-pointer flex justify-between items-center text-left transition-all"
                  >
                    <span className={newProjectManager ? 'text-slate-100' : 'text-slate-505'}>
                      {newProjectManager || 'Select Project Manager...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isManagerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsManagerDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                          style={{ contentVisibility: 'auto' }}
                        >
                          {teamList.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setNewProjectManager(t.name);
                                setIsManagerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                newProjectManager === t.name 
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                  : 'text-slate-350 hover:bg-slate-800 border border-transparent'
                              }`}
                            >
                              <span>{t.name}</span>
                              <span className="text-[10px] opacity-65 font-medium font-mono">{t.role}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button
                type="submit"
                disabled={isDbActionLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Project'}
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* GIS Operations Map */}
            <div className="p-5 lg:p-6 rounded-2xl glass-card relative overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    GIS Grid Operations Map
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Substation coordinates and telemetry positions</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Active Site</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Completed</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending</span>
                </div>
              </div>

              {/* Futuristic SVG Map Layout */}
              <div className="relative h-64 bg-slate-955/50 border border-slate-900 rounded-xl overflow-hidden flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]">
                {/* Cyber-grid background */}
                <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
                
                {projectsList.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono">No active nodes to map.</div>
                ) : (
                  <svg className="w-full h-full min-w-[500px]" viewBox="0 0 800 300">
                    <path d="M50 150 Q 150 50, 250 150 T 450 150 T 650 150 T 750 150" fill="none" stroke="rgba(6, 182, 212, 0.08)" strokeWidth="4" />
                    <path d="M100 200 Q 300 100, 500 200 T 700 200" fill="none" stroke="rgba(6, 182, 212, 0.04)" strokeWidth="2" />
                    
                    {/* Draw connections */}
                    {projectsList.map((p, idx) => {
                      if (idx === 0) return null;
                      const x1 = 150 + (idx - 1) * 120;
                      const y1 = 150 + (idx % 2 === 0 ? 40 : -40);
                      const x2 = 150 + idx * 120;
                      const y2 = 150 + ((idx + 1) % 2 === 0 ? 40 : -40);
                      return (
                        <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(6,182,212,0.15)" strokeWidth="1" strokeDasharray="5,5" />
                      );
                    })}

                    {/* Radar sweeps */}
                    <circle cx="400" cy="150" r="120" fill="none" stroke="rgba(6, 182, 212, 0.08)" strokeWidth="1" />
                    <circle cx="400" cy="150" r="60" fill="none" stroke="rgba(6, 182, 212, 0.04)" strokeWidth="1" />

                    {/* Active Project Markers */}
                    {projectsList.map((p, idx) => {
                      const x = 150 + idx * 120;
                      const y = 150 + ((idx + 1) % 2 === 0 ? 40 : -40);
                      const isActive = p.status === 'Active';
                      const isCompleted = p.status === 'Completed';
                      return (
                        <g key={p.id} className="cursor-pointer group" onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}>
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={isActive ? "10" : "6"} 
                            className={`fill-none ${
                              isCompleted ? 'stroke-cyan-500/20' : 
                              isActive ? 'stroke-green-500/30 animate-pulse' : 
                              'stroke-amber-500/20'
                            }`} 
                            strokeWidth="3" 
                          />
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={isActive ? "5" : "4"} 
                            className={`${
                              isCompleted ? 'fill-cyan-400' : 
                              isActive ? 'fill-green-400 animate-ping' : 
                              'fill-amber-400'
                            }`} 
                          />
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={isActive ? "4" : "3"} 
                            className={`${
                              isCompleted ? 'fill-cyan-500' : 
                              isActive ? 'fill-green-500' : 
                              'fill-amber-500'
                            }`} 
                          />
                          <text 
                            x={x + 10} 
                            y={y + 4} 
                            className="text-[9px] fill-slate-500 font-mono select-none group-hover:fill-slate-200 transition-colors font-bold"
                          >
                            {p.name.slice(0, 10)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
                
                <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-lg text-[10px] text-slate-400 font-mono">
                   <span className="font-bold text-slate-300 block mb-0.5">Substation Grid Radar</span>
                   Scanning {projectsList.length} operational hubs...
                </div>
              </div>
            </div>

            {/* Project List Table */}
            <motion.div 
              key="project-table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
              {projectsList.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <Activity className="w-14 h-14 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No projects registered</p>
                  <p className="text-xs text-slate-500 mt-1">Get started by clicking Add Project or seeding database.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/45 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="p-4">Project Name</th>
                        <th className="p-4 hidden sm:table-cell">Site Location</th>
                        <th className="p-4 hidden md:table-cell">Project Manager</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                      {projectsList.map((p) => (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-slate-900/30 transition-colors">
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 font-bold text-slate-100 cursor-pointer hover:text-cyan-400 transition-colors"
                            >
                              {p.name}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 hidden sm:table-cell font-medium cursor-pointer"
                            >
                              {p.site}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 hidden md:table-cell font-medium cursor-pointer"
                            >
                              {p.manager}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 cursor-pointer"
                            >
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                                p.status === 'Completed' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25' :
                                'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleDeleteDocument('projects', p.id, p.name)}
                                disabled={isDbActionLoading}
                                className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded hover:bg-rose-950/20 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Gantt milestones panel */}
                          {expandedProjectId === p.id && (
                            <tr className="bg-slate-950/20">
                              <td colSpan={5} className="p-4 border-t border-slate-800/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Project Gantt Milestones</h5>
                                    <div className="space-y-2.5">
                                      {milestonesList.map((mName, mIdx) => {
                                        const isDone = (p.completedMilestones || []).includes(mName);
                                        return (
                                          <label key={mIdx} className="flex items-center gap-3 cursor-pointer group text-xs text-slate-350 select-none">
                                            <input
                                              type="checkbox"
                                              checked={isDone}
                                              onChange={() => handleToggleMilestone(p, mName)}
                                              disabled={isDbActionLoading}
                                              className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className={`transition-all ${isDone ? 'line-through text-slate-500' : 'group-hover:text-slate-100'}`}>
                                              {mName}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Installation Roadmap</h5>
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1 text-slate-400">
                                          <span>Completion Progress</span>
                                          <span className="text-cyan-400">{Math.round(((p.completedMilestones || []).length / milestonesList.length) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                          <div 
                                            className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                            style={{ width: `${((p.completedMilestones || []).length / milestonesList.length) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-[11px] leading-relaxed text-slate-400">
                                        <span className="font-bold text-slate-200 block mb-1">Status Report</span>
                                        {p.status === 'Completed' ? 'Installation is fully commissioned and synced to the local grid network.' :
                                         (p.completedMilestones || []).length === milestonesList.length ? 'All safety permits and wiring are completed. Pending final commissioning approvals.' :
                                         'Project is currently in progress. Ensure safety permits are logged under the Safety tab before wiring.'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
