import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  UserPlus, 
  MapPin, 
  AlertTriangle, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

interface Shift {
  id: string;
  technicianId: string;
  technicianName: string;
  projectId: string;
  projectName: string;
  date: string; // YYYY-MM-DD
  time: string;
  status: 'Scheduled' | 'On Time' | 'Delayed' | 'Absent';
}

export default function Scheduling() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().slice(0, 10));

  // Dispatch Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [shiftTime, setShiftTime] = useState('08:00 - 17:00');

  // Custom Dropdown Open States
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);



  // Fetch collections
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Rahul Sharma', role: 'Lead Electrician' },
        { id: '2', name: 'Sanjay Kumar', role: 'Safety Engineer' }
      ]);
      setProjectsList([
        { id: '1', name: 'Grid Substation Hubli', site: 'Site Alpha' },
        { id: '2', name: 'Koppal Wind Farm', site: 'Site Beta' }
      ]);
      setSchedules([
        { id: '1', technicianId: '1', technicianName: 'Rahul Sharma', projectId: '1', projectName: 'Grid Substation Hubli', date: new Date().toISOString().slice(0, 10), time: '08:00 - 17:00', status: 'Scheduled' }
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

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Shift));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setFirestoreError(err.code);
      setLoading(false);
    });

    return () => {
      unsubTeam();
      unsubProjects();
      unsubSchedules();
    };
  }, [setFirestoreError]);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId || !selectedProjectId || !selectedDateStr) return;

    const tech = teamList.find(t => t.id === selectedTechId);
    const proj = projectsList.find(p => p.id === selectedProjectId);

    const shiftData = {
      technicianId: selectedTechId,
      technicianName: tech?.name || 'Unknown',
      projectId: selectedProjectId,
      projectName: proj?.name || 'Unknown Site',
      date: selectedDateStr,
      time: shiftTime,
      status: 'Scheduled' as const
    };

    setIsDbActionLoading(true);
    try {
      if (db) {
        await addDoc(collection(db, 'schedules'), shiftData);
        // Log activity
        await addDoc(collection(db, 'activities'), {
          title: 'Shift Dispatched',
          desc: `Assigned ${tech?.name || 'Technician'} to ${proj?.name || 'Site'} on ${selectedDateStr}`,
          type: 'settings',
          timestamp: Timestamp.now()
        });
        // Create custom notification in db
        await addDoc(collection(db, 'notifications'), {
          title: 'New Dispatch Scheduled',
          desc: `${tech?.name} assigned to ${proj?.name} for ${selectedDateStr}`,
          type: 'schedule',
          timestamp: Timestamp.now()
        });
      } else {
        setSchedules(prev => [...prev, { id: Math.random().toString(), ...shiftData }]);
      }
      setShowAddForm(false);
      setSelectedTechId('');
      setSelectedProjectId('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleUpdateStatus = async (shiftId: string, status: Shift['status']) => {
    setIsDbActionLoading(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'schedules', shiftId), { status });
      } else {
        setSchedules(prev => prev.map(s => s.id === shiftId ? { ...s, status } : s));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm("Are you sure you want to cancel this shift?")) return;
    setIsDbActionLoading(true);
    try {
      if (db) {
        await deleteDoc(doc(db, 'schedules', shiftId));
      } else {
        setSchedules(prev => prev.filter(s => s.id !== shiftId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Build grid days
  const calendarCells = [];
  // Fill empty leading boxes
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Fill calendar days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const getDayShifts = (dayNum: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return schedules.filter(s => s.date === dayStr);
  };

  const selectedDateShifts = schedules.filter(s => s.date === selectedDateStr);

  if (loading) {
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
      className="space-y-6 pb-10"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            Scheduling & Dispatch Board
          </h3>
          <p className="text-xs text-slate-400 mt-1">Assign field engineers to active substations and grid hubs</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            Create Dispatch Shift
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="xl:col-span-2 p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex justify-between items-center pb-2">
            <h4 className="text-sm font-bold text-slate-200 font-mono tracking-wider uppercase">
              {monthNames[month]} {year}
            </h4>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square bg-slate-950/20 rounded-xl border border-transparent" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDateStr === dateStr;
              const dayShifts = getDayShifts(day);

              return (
                <div 
                  key={`day-${day}`}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`aspect-square p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400' 
                      : 'bg-slate-950/45 border-slate-900 hover:border-slate-800 text-slate-350'
                  }`}
                >
                  <span className="font-bold text-xs">{day}</span>
                  <div className="flex flex-wrap gap-0.5 justify-end mt-1 overflow-hidden">
                    {dayShifts.slice(0, 3).map((s, sIdx) => (
                      <span 
                        key={s.id || sIdx}
                        className={`w-4 h-4 rounded-full text-[8px] font-extrabold flex items-center justify-center border ${
                          s.status === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          s.status === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          s.status === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        }`}
                        title={`${s.technicianName} ➜ ${s.projectName}`}
                      >
                        {s.technicianName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                    {dayShifts.length > 3 && (
                      <span className="text-[8px] font-bold text-slate-500">+{dayShifts.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>        {/* Sidebar Panel */}
        <div className="space-y-6 flex flex-col">
          {/* Selected Day Shifts Panel */}
          <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col min-h-[350px]">
            <div className="pb-3 border-b border-slate-800 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Duty Logs</h4>
                <span className="text-slate-200 text-sm font-semibold mt-1 block">{selectedDateStr}</span>
              </div>
              <span className="text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 font-bold text-slate-400">
                {selectedDateShifts.length} Shift(s)
              </span>
            </div>

            {selectedDateShifts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Clock className="w-12 h-12 text-slate-800 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No shifts scheduled for this date</p>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 text-[10px] text-cyan-400 hover:underline font-bold"
                  >
                    + Add Dispatch Assignment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
                {selectedDateShifts.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl relative group hover:border-slate-850 transition-all">
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteShift(s.id)}
                        className="absolute top-3 right-3 p-1 text-slate-600 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {s.technicianName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-slate-100 leading-tight">{s.technicianName}</h5>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {s.projectName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block">
                          {s.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-900/60">
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Status:</span>
                      {isAdmin ? (
                        <select
                          value={s.status}
                          onChange={(e) => handleUpdateStatus(s.id, e.target.value as Shift['status'])}
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border bg-slate-950 cursor-pointer ${
                            s.status === 'On Time' ? 'border-green-500/20 text-green-400' :
                            s.status === 'Delayed' ? 'border-amber-500/20 text-amber-400' :
                            s.status === 'Absent' ? 'border-rose-500/20 text-rose-400' :
                            'border-slate-700 text-slate-400'
                          }`}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="On Time">On Time</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Absent">Absent</option>
                        </select>
                      ) : (
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          s.status === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          s.status === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          s.status === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          'bg-slate-900 border-slate-800 text-slate-450'
                        }`}>
                          {s.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Creator Modal Popup */}
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
              className="relative w-full max-w-md glass-card p-6 rounded-2xl shadow-2xl border border-white/10 z-10"
            >
              <button 
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-bold text-slate-100 mb-4 font-mono uppercase tracking-wider">Assign Dispatch Shift</h4>
              <form onSubmit={handleAddShift} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Date</label>
                  <input 
                    type="date"
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-505 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Dispatch Technician</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTechDropdownOpen(!isTechDropdownOpen)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm cursor-pointer flex justify-between items-center text-left"
                    >
                      <span className={selectedTechId ? 'text-slate-100' : 'text-slate-500'}>
                        {selectedTechId 
                          ? teamList.find(t => t.id === selectedTechId)?.name + ` (${teamList.find(t => t.id === selectedTechId)?.role})`
                          : 'Select Technician...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isTechDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isTechDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsTechDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-20 w-full mt-1.5 bg-slate-955 border border-slate-850 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                          >
                            {teamList.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTechId(t.id);
                                  setIsTechDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                  selectedTechId === t.id 
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                    : 'text-slate-350 hover:bg-slate-900 border border-transparent'
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

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Project Site Hub</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm cursor-pointer flex justify-between items-center text-left"
                    >
                      <span className={selectedProjectId ? 'text-slate-100' : 'text-slate-500'}>
                        {selectedProjectId 
                          ? projectsList.find(p => p.id === selectedProjectId)?.name + ` (${projectsList.find(p => p.id === selectedProjectId)?.site})`
                          : 'Select Substation Site...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isProjectDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsProjectDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-20 w-full mt-1.5 bg-slate-955 border border-slate-850 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                          >
                            {projectsList.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProjectId(p.id);
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                  selectedProjectId === p.id 
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                    : 'text-slate-350 hover:bg-slate-900 border border-transparent'
                                }`}
                              >
                                <span>{p.name}</span>
                                <span className="text-[10px] opacity-65 font-medium font-mono">{p.site}</span>
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Shift Timing</label>
                  <input 
                    type="text"
                    value={shiftTime}
                    onChange={(e) => setShiftTime(e.target.value)}
                    required
                    placeholder="e.g. 08:00 - 17:00"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-505 text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Dispatch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
