import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Projects() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

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

    return () => unsubProjects();
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Project Directory</h3>
          <p className="text-xs text-slate-500 mt-1">APEC active and pipeline installations</p>
        </div>
        <button 
          onClick={() => setIsAddingProject(!isAddingProject)}
          disabled={isDbActionLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0e2a47] to-[#1c446c] hover:from-[#0a2540] hover:to-[#173b5f] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(14,42,71,0.12)] hover:shadow-lg disabled:opacity-50"
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
            className="max-w-xl glass-card border border-white/60 p-6 rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.04)]"
          >
            <h4 className="text-sm font-bold text-slate-900 mb-4">Register New APEC Installation</h4>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wider">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Grid Substation Hubli"
                  required
                  className="w-full bg-white/80 border border-slate-200/80 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wider">Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value)}
                    className="w-full bg-white/80 border border-slate-200/80 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wider">Location Site</label>
                  <input 
                    type="text" 
                    value={newProjectSite}
                    onChange={(e) => setNewProjectSite(e.target.value)}
                    placeholder="e.g. Site A"
                    className="w-full bg-white/80 border border-slate-200/80 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1 tracking-wider">Project Manager</label>
                <input 
                  type="text" 
                  value={newProjectManager}
                  onChange={(e) => setNewProjectManager(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-white/80 border border-slate-200/80 text-slate-900 rounded-xl py-3 px-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                />
              </div>
              <button
                type="submit"
                disabled={isDbActionLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#0e2a47] to-[#1e4670] hover:from-[#0a2540] hover:to-[#173d63] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(14,42,71,0.15)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Project'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="project-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card border border-white/60 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.03)]"
          >
            {projectsList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Activity className="w-14 h-14 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No projects registered</p>
                <p className="text-xs text-slate-400 mt-1">Get started by clicking Add Project or seeding database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-white/40 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-4">Project Name</th>
                      <th className="p-4">Site Location</th>
                      <th className="p-4">Project Manager</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 text-sm text-slate-650">
                    {projectsList.map((p) => (
                      <tr key={p.id} className="hover:bg-white/40 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{p.name}</td>
                        <td className="p-4 font-medium">{p.site}</td>
                        <td className="p-4 font-medium">{p.manager}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                            p.status === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
                            'bg-amber-50 text-amber-700 border border-amber-200/50'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDeleteDocument('projects', p.id, p.name)}
                            disabled={isDbActionLoading}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                       </tr>
                    ))}
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
