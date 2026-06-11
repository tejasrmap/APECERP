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
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Check
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

  // Calendar / Planner States
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Dispatch Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [shiftTime, setShiftTime] = useState('08:00 - 17:00');

  // Custom Dropdown Open States
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Optimization States
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [syncingShiftId, setSyncingShiftId] = useState<string | null>(null);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);

  // Date String Helper
  const getLocalDateString = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Fetch collections
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', role: 'Lead Electrician' },
        { id: '2', name: 'Sanjay Kumar', email: 'sanjay@apecpowersolutions.com', employeeId: 'APEC-1003', role: 'Safety Engineer' }
      ]);
      setProjectsList([
        { id: '1', name: 'Grid Substation Hubli', site: 'Site Alpha' },
        { id: '2', name: 'Koppal Wind Farm', site: 'Site Beta' }
      ]);
      setSchedules([
        { id: '1', technicianId: '1', technicianName: 'Rahul Sharma', projectId: '1', projectName: 'Grid Substation Hubli', date: new Date().toISOString().slice(0, 10), time: '08:00 - 17:00', status: 'Scheduled' }
      ]);
      // Mock offline attendance logs matching Rahul Sharma's punch-in today at 8:05 AM
      const todayStr = new Date().toISOString().slice(0, 10);
      const mockAttendance = [
        {
          id: 'mock-1',
          employeeId: 'APEC-1002',
          userName: 'Rahul Sharma',
          userEmail: 'rahul@apecpowersolutions.com',
          type: 'punch_in',
          timestamp: `${todayStr}T08:05:00.000Z`,
          location: { address: 'Hubli Substation Entry' }
        }
      ];
      setAttendanceLogs(mockAttendance);
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
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        let tsString = new Date().toISOString();
        if (data.timestamp) {
          if (data.timestamp.toDate) tsString = data.timestamp.toDate().toISOString();
          else if (data.timestamp.seconds) tsString = new Date(data.timestamp.seconds * 1000).toISOString();
        }
        return {
          id: d.id,
          ...data,
          timestamp: tsString
        };
      });
      setAttendanceLogs(list);
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
      unsubAttendance();
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

  // O(1) Attendance Lookup Dictionary (Performance Optimization)
  const attendanceLookup = React.useMemo(() => {
    const lookup: Record<string, any[]> = {};
    attendanceLogs.forEach(log => {
      if (!log.timestamp) return;
      const d = new Date(log.timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const addKey = (k: string) => {
        const key = `${dateStr}_${k.toLowerCase()}`;
        if (!lookup[key]) lookup[key] = [];
        lookup[key].push(log);
      };

      if (log.employeeId) addKey(log.employeeId);
      if (log.userEmail) addKey(log.userEmail);
      if (log.userName) addKey(log.userName);
    });
    return lookup;
  }, [attendanceLogs]);

  // Helper to parse shift start time and compare with punch in times
  const getAutoStatus = (shift: Shift) => {
    const tech = teamList.find(t => t.id === shift.technicianId);
    if (!tech) return { status: 'Scheduled' as const, details: 'No technician details', punchTime: null };

    // Search keys
    const keys = [];
    if (tech.employeeId) keys.push(`${shift.date}_${tech.employeeId.toLowerCase()}`);
    if (tech.email) keys.push(`${shift.date}_${tech.email.toLowerCase()}`);
    if (tech.name) keys.push(`${shift.date}_${tech.name.toLowerCase()}`);

    // Retrieve from lookup table
    let techPunches: any[] = [];
    for (const key of keys) {
      if (attendanceLookup[key]) {
        techPunches = attendanceLookup[key].filter((l: any) => l.type === 'punch_in');
        if (techPunches.length > 0) break;
      }
    }

    if (techPunches.length === 0) {
      const timeParts = shift.time.split('-');
      const startTimeStr = timeParts[0]?.trim() || '08:00';
      const [shStr, smStr] = startTimeStr.split(':');
      
      const shiftStart = new Date(shift.date);
      shiftStart.setHours(parseInt(shStr) || 8, parseInt(smStr) || 0, 0, 0);

      const now = new Date();
      if (now.getTime() - shiftStart.getTime() > 2 * 60 * 60 * 1000) {
        return { status: 'Absent' as const, details: 'No punch-in recorded (Shift started >2h ago)', punchTime: null };
      }
      return { status: 'Scheduled' as const, details: 'Awaiting punch-in...', punchTime: null };
    }

    techPunches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const earliestPunch = techPunches[0];
    const punchTimeObj = new Date(earliestPunch.timestamp);
    const punchTimeStr = punchTimeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Calculate latency
    const timeParts = shift.time.split('-');
    const startTimeStr = timeParts[0]?.trim() || '08:00';
    const [shStr, smStr] = startTimeStr.split(':');
    const shiftStart = new Date(shift.date);
    shiftStart.setHours(parseInt(shStr) || 8, parseInt(smStr) || 0, 0, 0);

    const diffMinutes = Math.floor((punchTimeObj.getTime() - shiftStart.getTime()) / (1000 * 60));

    if (diffMinutes <= 15) {
      return { 
        status: 'On Time' as const, 
        details: `Punched in on time at ${punchTimeStr}`, 
        punchTime: punchTimeStr 
      };
    } else {
      return { 
        status: 'Delayed' as const, 
        details: `Punched in ${diffMinutes}m late at ${punchTimeStr}`, 
        punchTime: punchTimeStr 
      };
    }
  };

  const handleSyncStatus = async (shiftId: string, status: Shift['status']) => {
    setSyncingShiftId(shiftId);
    try {
      await handleUpdateStatus(shiftId, status);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingShiftId(null);
    }
  };

  // Helper to calculate duration in hours from shift time (e.g. "08:00 - 17:00" -> 9 hours)
  const calculateShiftHours = (timeStr: string): number => {
    try {
      const parts = timeStr.split('-');
      if (parts.length !== 2) return 8;
      const [start, end] = parts.map(p => p.trim());
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      let diffMins = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
      if (diffMins < 0) diffMins += 24 * 60; // overnight shifts
      return Math.round((diffMins / 60) * 10) / 10;
    } catch {
      return 8;
    }
  };

  // Helper to calculate total weekly hours scheduled for a technician
  const getWeeklyHoursForTech = (techId: string, refDateStr: string): number => {
    const refDate = new Date(refDateStr);
    const day = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(refDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekShifts = schedules.filter(s => {
      if (s.technicianId !== techId) return false;
      const shiftDate = new Date(s.date);
      return shiftDate >= monday && shiftDate <= sunday;
    });

    return weekShifts.reduce((sum, s) => sum + calculateShiftHours(s.time), 0);
  };

  // Daily Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - 1);
    setSelectedDateStr(getLocalDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + 1);
    setSelectedDateStr(getLocalDateString(d));
  };

  const handleToday = () => {
    setSelectedDateStr(getLocalDateString(new Date()));
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            Daily Hours & Dispatch Planner
          </h3>
          <p className="text-xs text-slate-400 mt-1">Plan engineer hours, balance weekly workloads, and sync verified attendance logs</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setSelectedTechId('');
              setSelectedProjectId('');
              setShowAddForm(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            Create Dispatch Shift
          </button>
        )}
      </div>

      {/* Daily Planner Control Card */}
      <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-6">
        
        {/* Date Navigation & Summary Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          {/* Day Navigation Controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Today
            </button>
            <button 
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <span className="text-slate-100 text-sm font-semibold ml-2 font-mono">
              {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Quick Date Selector & Daily Hours Stats */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-505 uppercase tracking-wider">Jump to Date:</span>
              <input 
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="bg-slate-955 border border-slate-900 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-955/60 border border-slate-900 rounded-xl px-4 py-2">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Today's Schedule load</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {selectedDateShifts.reduce((sum, s) => sum + calculateShiftHours(s.time), 0)} hrs ({selectedDateShifts.length} shifts)
                </span>
              </div>
              <Clock className="w-4 h-4 text-cyan-505 opacity-60" />
            </div>
          </div>
        </div>

        {/* Technician Workload & Dispatch Grid */}
        <div className="space-y-4">
          <div className="hidden lg:grid grid-cols-12 gap-4 text-slate-505 text-[10px] font-bold uppercase tracking-wider px-4">
            <div className="col-span-3">Technician Details</div>
            <div className="col-span-5">Shift Schedule & Hours</div>
            <div className="col-span-3">Attendance Match Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-900/60 space-y-3.5">
            {teamList.map((tech) => {
              // Find shift for this tech on selected date
              const shift = schedules.find(s => s.technicianId === tech.id && s.date === selectedDateStr);
              const weeklyHours = getWeeklyHoursForTech(tech.id, selectedDateStr);
              const isOvertimeLimit = weeklyHours > 48;

              return (
                <div 
                  key={tech.id} 
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-4 rounded-2xl border transition-all ${
                    shift 
                      ? 'bg-slate-955/20 border-slate-900 hover:border-slate-850' 
                      : 'bg-slate-955/40 border-slate-900/40 border-dashed hover:border-slate-800'
                  }`}
                >
                  {/* Col 1: Technician Profile Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner">
                      {tech.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{tech.name}</h4>
                      <p className="text-[10px] text-slate-505 font-mono truncate">{tech.role}</p>
                      
                      {/* Workload hours count */}
                      <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isOvertimeLimit 
                          ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400' 
                          : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}>
                        Week load: {weeklyHours}h {isOvertimeLimit && '⚠️ Overtime'}
                      </span>
                    </div>
                  </div>

                  {/* Col 2: Shift Details */}
                  <div className="col-span-5">
                    {shift ? (
                      <div className="p-3 bg-slate-955/65 border border-slate-900 rounded-xl space-y-2 relative">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              {shift.projectName}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-mono block">
                              Time: {shift.time}
                            </span>
                          </div>
                          
                          {/* Hours sum display */}
                          <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">
                            {calculateShiftHours(shift.time)} hrs
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Slot Add Dispatch button */
                      isAdmin ? (
                        <button
                          onClick={() => {
                            setSelectedTechId(tech.id);
                            setShowAddForm(true);
                          }}
                          className="w-full py-4 border border-dashed border-slate-800 hover:border-cyan-500/30 hover:bg-cyan-500/5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 hover:text-cyan-400 font-semibold cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Assign Dispatch Shift
                        </button>
                      ) : (
                        <div className="text-[10px] text-slate-650 font-medium italic py-2">No shift assigned today</div>
                      )
                    )}
                  </div>

                  {/* Col 3: Attendance Match Verification */}
                  <div className="col-span-3">
                    {shift ? (
                      (() => {
                        const autoMatch = getAutoStatus(shift);
                        const isSyncNeeded = autoMatch.status !== shift.status;
                        
                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                autoMatch.status === 'On Time' ? 'border-green-500/15 text-green-400 bg-green-500/5' :
                                autoMatch.status === 'Delayed' ? 'border-amber-500/15 text-amber-400 bg-amber-500/5' :
                                autoMatch.status === 'Absent' ? 'border-rose-500/15 text-rose-400 bg-rose-500/5' :
                                'border-slate-800 text-slate-450 bg-slate-900/10'
                              }`}>
                                {autoMatch.status === 'On Time' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                {autoMatch.status === 'Delayed' && <AlertTriangle className="w-2.5 h-2.5" />}
                                {autoMatch.status}
                              </span>

                              {isAdmin && isSyncNeeded && (
                                <button
                                  disabled={syncingShiftId === shift.id}
                                  onClick={() => handleSyncStatus(shift.id, autoMatch.status)}
                                  className="p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 transition-all cursor-pointer"
                                  title="Sync to Verified Status"
                                >
                                  {syncingShiftId === shift.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <span className="text-[9.5px] text-slate-500 block leading-tight font-medium">
                              {autoMatch.details}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-[10px] text-slate-650 font-mono">—</span>
                    )}
                  </div>

                  {/* Col 4: Dispatch Actions */}
                  <div className="col-span-1 text-right flex items-center justify-end gap-2.5">
                    {shift && (
                      <>
                        {/* Custom Dropdown selection for Shift Status override */}
                        {isAdmin ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveStatusDropdown(activeStatusDropdown === shift.id ? null : shift.id)}
                              className={`text-[9.5px] font-bold px-2 py-1 rounded-xl border bg-slate-950 cursor-pointer flex items-center gap-1 transition-colors ${
                                shift.status === 'On Time' ? 'border-green-500/30 text-green-400 hover:bg-green-500/5' :
                                shift.status === 'Delayed' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/5' :
                                shift.status === 'Absent' ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5' :
                                'border-slate-800 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              {shift.status}
                              <ChevronDown className="w-3 h-3 text-slate-500" />
                            </button>
                            <AnimatePresence>
                              {activeStatusDropdown === shift.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdown(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    className="absolute right-0 top-full mt-1 z-20 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl space-y-0.5 min-w-[110px]"
                                  >
                                    {(['Scheduled', 'On Time', 'Delayed', 'Absent'] as const).map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          handleUpdateStatus(shift.id, opt);
                                          setActiveStatusDropdown(null);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                                          shift.status === opt 
                                            ? 'bg-cyan-500/10 text-cyan-400' 
                                            : 'text-slate-350 hover:bg-slate-950'
                                        }`}
                                      >
                                        {opt}
                                        {shift.status === opt && <Check className="w-3 h-3 text-cyan-400" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            shift.status === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                            shift.status === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            shift.status === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                            'bg-slate-900 border-slate-800 text-slate-450'
                          }`}>
                            {shift.status}
                          </span>
                        )}

                        {/* Delete Shift Button */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 rounded hover:bg-rose-500/5 transition-all cursor-pointer"
                            title="Cancel Dispatch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm shadow-2xl"
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
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h4 className="text-sm font-bold text-slate-100 mb-4 font-mono uppercase tracking-wider">Assign Dispatch Shift</h4>
              
              {/* Double-Booking Warning Alert */}
              {(() => {
                const isAlreadyBooked = schedules.some(s => s.technicianId === selectedTechId && s.date === selectedDateStr);
                if (isAlreadyBooked) {
                  return (
                    <div className="p-3 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10.5px] leading-tight flex items-start gap-2 animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-rose-350">Double-Booking Warning</span>
                        This technician already has another shift scheduled on this date.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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
                      className="w-full bg-slate-955 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm cursor-pointer flex justify-between items-center text-left"
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
                            className="absolute z-20 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                          >
                            {teamList.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTechId(t.id);
                                  setIsTechDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                                  selectedTechId === t.id 
                                    ? 'bg-cyan-500/10 text-cyan-400' 
                                    : 'text-slate-350 hover:bg-slate-950'
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
                  <label className="text-[10px] font-semibold text-slate-405 uppercase tracking-wider ml-1">Project Site Hub</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="w-full bg-slate-955 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm cursor-pointer flex justify-between items-center text-left"
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
                            className="absolute z-20 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                          >
                            {projectsList.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProjectId(p.id);
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                                  selectedProjectId === p.id 
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                    : 'text-slate-350 hover:bg-slate-950 border border-transparent'
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
                  <label className="text-[10px] font-semibold text-slate-405 uppercase tracking-wider ml-1">Shift Timing</label>
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
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
