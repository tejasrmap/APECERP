import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  Plus, 
  ArrowLeft, 
  X, 
  Loader2, 
  ShieldCheck 
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

interface Permit {
  id: string;
  technicianName: string;
  projectName: string;
  hazardLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  checklist: string[];
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
}

export default function Safety() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [permits, setPermits] = useState<Permit[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [hazardLevel, setHazardLevel] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [workDetails, setWorkDetails] = useState('');
  
  // Checklist states
  const [ppeChecked, setPpeChecked] = useState(false);
  const [lotoChecked, setLotoChecked] = useState(false);
  const [voltageChecked, setVoltageChecked] = useState(false);
  const [exitChecked, setExitChecked] = useState(false);

  // Fetch data
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Rahul Sharma' },
        { id: '2', name: 'Sanjay Kumar' }
      ]);
      setProjectsList([
        { id: '1', name: 'Grid Substation Hubli' },
        { id: '2', name: 'Koppal Wind Farm' }
      ]);
      setPermits([
        {
          id: '1',
          technicianName: 'Rahul Sharma',
          projectName: 'Grid Substation Hubli',
          hazardLevel: 'High',
          checklist: ['PPE Equipped', 'LOTO Applied', 'Voltage Inspected'],
          description: 'Transformer 3 high voltage tap changing and core maintenance.',
          status: 'Pending',
          timestamp: new Date().toLocaleDateString()
        }
      ]);
      setLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snap) => {
      setTeamList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjectsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPermits = onSnapshot(collection(db, 'safety_permits'), (snap) => {
      setPermits(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Permit));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setFirestoreError(err.code);
      setLoading(false);
    });

    return () => {
      unsubTeam();
      unsubProjects();
      unsubPermits();
    };
  }, [setFirestoreError]);

  const handleSubmitPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechName || !selectedProjectName) return;

    // Collect checks
    const activeChecks: string[] = [];
    if (ppeChecked) activeChecks.push('PPE Equipped');
    if (lotoChecked) activeChecks.push('LOTO Applied');
    if (voltageChecked) activeChecks.push('Voltage Inspected');
    if (exitChecked) activeChecks.push('Escape Route Clear');

    const permitData = {
      technicianName: selectedTechName,
      projectName: selectedProjectName,
      hazardLevel,
      checklist: activeChecks,
      description: workDetails,
      status: 'Pending' as const,
      timestamp: new Date().toLocaleDateString()
    };

    setIsDbActionLoading(true);
    try {
      if (db) {
        await addDoc(collection(db, 'safety_permits'), permitData);
        // Add log activity
        await addDoc(collection(db, 'activities'), {
          title: 'Permit PTW Submitted',
          desc: `Safety permit submitted by ${selectedTechName} for ${selectedProjectName}`,
          type: 'alert',
          timestamp: Timestamp.now()
        });
        // Add notification warning
        await addDoc(collection(db, 'notifications'), {
          title: 'Safety Permit Pending',
          desc: `${selectedTechName} requested PTW at ${selectedProjectName} (${hazardLevel} Hazard)`,
          type: 'permit',
          timestamp: Timestamp.now()
        });
      } else {
        setPermits(prev => [...prev, { id: Math.random().toString(), ...permitData }]);
      }
      setShowAddForm(false);
      setWorkDetails('');
      setPpeChecked(false);
      setLotoChecked(false);
      setVoltageChecked(false);
      setExitChecked(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleApprove = async (permitId: string, techName: string, siteName: string) => {
    setIsDbActionLoading(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'safety_permits', permitId), { status: 'Approved' });
        // Log activity
        await addDoc(collection(db, 'activities'), {
          title: 'Permit PTW Approved',
          desc: `Safety permit for ${techName} at ${siteName} was approved`,
          type: 'task',
          timestamp: Timestamp.now()
        });
        // Notification
        await addDoc(collection(db, 'notifications'), {
          title: 'Safety Permit Approved',
          desc: `PTW Access authorized for ${techName} at ${siteName}`,
          type: 'task',
          timestamp: Timestamp.now()
        });
      } else {
        setPermits(prev => prev.map(p => p.id === permitId ? { ...p, status: 'Approved' } : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleReject = async (permitId: string, techName: string, siteName: string) => {
    setIsDbActionLoading(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'safety_permits', permitId), { status: 'Rejected' });
        // Log activity
        await addDoc(collection(db, 'activities'), {
          title: 'Permit PTW Rejected',
          desc: `Safety permit for ${techName} at ${siteName} was denied`,
          type: 'alert',
          timestamp: Timestamp.now()
        });
        // Notification
        await addDoc(collection(db, 'notifications'), {
          title: 'Safety Permit Denied',
          desc: `PTW Access blocked for ${techName} at ${siteName}`,
          type: 'alert',
          timestamp: Timestamp.now()
        });
      } else {
        setPermits(prev => prev.map(p => p.id === permitId ? { ...p, status: 'Rejected' } : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeletePermit = async (permitId: string) => {
    if (!window.confirm("Are you sure you want to delete this safety record?")) return;
    setIsDbActionLoading(true);
    try {
      if (db) {
        await deleteDoc(doc(db, 'safety_permits', permitId));
      } else {
        setPermits(prev => prev.filter(p => p.id !== permitId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a13]/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Safety Operations & Permits (PTW)
          </h3>
          <p className="text-xs text-slate-400 mt-1">Review active safety audits, Lockout-Tagout (LOTO) logs, and clearances</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Request Permit-to-Work
        </button>
      </div>

      {/* Permits List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {permits.length === 0 ? (
          <div className="md:col-span-2 p-12 glass-card rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-12 h-12 text-slate-800 mb-2" />
            <p className="text-sm font-medium text-slate-400">No safety permits logged</p>
            <p className="text-xs text-slate-505 mt-1">Click "Request Permit-to-Work" to submit safety clearance.</p>
          </div>
        ) : (
          permits.map((p) => (
            <div key={p.id} className="p-5 lg:p-6 rounded-2xl glass-card relative overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between group">
              {isAdmin && (
                <button 
                  onClick={() => handleDeletePermit(p.id)}
                  className="absolute top-4 right-4 p-1.5 text-slate-600 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Permit Record"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Substation/Site Location</span>
                    <h4 className="font-bold text-slate-100 text-base mt-0.5">{p.projectName}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-widest ${
                    p.status === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    p.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  } border`}>
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono py-1 border-y border-slate-900/40">
                  <div>
                    <span className="text-slate-500 block">Technician:</span>
                    <span className="text-slate-300 font-bold block">{p.technicianName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hazard Class:</span>
                    <span className={`font-bold block ${
                      p.hazardLevel === 'Critical' || p.hazardLevel === 'High' ? 'text-rose-400' : 'text-amber-400'
                    }`}>{p.hazardLevel} Severity</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Checked Clearances</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.checklist.map((c, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-900 text-[10px] text-slate-400 font-medium">
                        ✓ {c}
                      </span>
                    ))}
                    {p.checklist.length === 0 && (
                      <span className="text-[10px] text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 font-bold">
                        ⚠️ No Safety Checklist Checked!
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Hazards & Work Scope</span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{p.description}</p>
                </div>
              </div>

              {p.status === 'Pending' && isAdmin && (
                <div className="flex gap-2.5 mt-5 pt-3.5 border-t border-slate-900/60">
                  <button 
                    onClick={() => handleApprove(p.id, p.technicianName, p.projectName)}
                    disabled={isDbActionLoading}
                    className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-slate-955 text-xs font-bold transition-all"
                  >
                    Authorize PTW
                  </button>
                  <button 
                    onClick={() => handleReject(p.id, p.technicianName, p.projectName)}
                    disabled={isDbActionLoading}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-500 text-xs font-bold transition-all"
                  >
                    Deny Access
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Safety Request Permit Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowAddForm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg glass-card p-6 rounded-2xl shadow-2xl border border-white/10 z-10"
            >
              <button 
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-bold text-slate-100 mb-4 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                Permit-To-Work Request
              </h4>
              <form onSubmit={handleSubmitPermit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Technician</label>
                    <select
                      value={selectedTechName}
                      onChange={(e) => setSelectedTechName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-505 text-xs cursor-pointer"
                    >
                      <option value="">Select Technician...</option>
                      {teamList.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Project Site Hub</label>
                    <select
                      value={selectedProjectName}
                      onChange={(e) => setSelectedProjectName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-505 text-xs cursor-pointer"
                    >
                      <option value="">Select Site Substation...</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Hazard Severity Rating</label>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High', 'Critical'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setHazardLevel(level as any)}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          hazardLevel === level
                            ? level === 'Critical' ? 'bg-rose-500/20 border-rose-500 text-rose-400' :
                              level === 'High' ? 'bg-rose-500/10 border-rose-500/50 text-rose-455' :
                              level === 'Medium' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' :
                              'bg-green-500/10 border-green-500/50 text-green-400'
                            : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-850 hover:text-slate-350'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1 block">Audit / Safety Checklist Verification</label>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={ppeChecked}
                        onChange={(e) => setPpeChecked(e.target.checked)}
                        className="w-4 h-4 bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 rounded cursor-pointer"
                      />
                      PPE Gear Equipped
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={lotoChecked}
                        onChange={(e) => setLotoChecked(e.target.checked)}
                        className="w-4 h-4 bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 rounded cursor-pointer"
                      />
                      LOTO Tags Applied
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={voltageChecked}
                        onChange={(e) => setVoltageChecked(e.target.checked)}
                        className="w-4 h-4 bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 rounded cursor-pointer"
                      />
                      Voltage Inspected
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={exitChecked}
                        onChange={(e) => setExitChecked(e.target.checked)}
                        className="w-4 h-4 bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 rounded cursor-pointer"
                      />
                      Escape Route Clear
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Work Scope & Hazard Details</label>
                  <textarea
                    rows={3}
                    value={workDetails}
                    onChange={(e) => setWorkDetails(e.target.value)}
                    required
                    placeholder="e.g. Discharging capacitor banks and wire replacement. Live lines locked on breaker panel 2A..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-105 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-505 text-xs placeholder:text-slate-600"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit PTW Clearance'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
