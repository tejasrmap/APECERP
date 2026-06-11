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

  // Optimization States
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });
  const [mobileTab, setMobileTab] = useState<'board' | 'logs'>('board');
  const [syncingShiftId, setSyncingShiftId] = useState<string | null>(null);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);




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

  // Helper to parse shift start time and compare with punch in times
  const getAutoStatus = (shift: Shift) => {
    const tech = teamList.find(t => t.id === shift.technicianId);
    if (!tech) return { status: 'Scheduled' as const, details: 'No technician details', punchTime: null };

    // Find punch in logs for this technician on the shift date
    const techPunches = attendanceLogs.filter(log => {
      // Check date
      const logDate = new Date(log.timestamp);
      const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      if (logDateStr !== shift.date) return false;

      // Check user identity (employee ID or email or name)
      const empIdMatch = tech.employeeId && log.employeeId && tech.employeeId.toLowerCase() === log.employeeId.toLowerCase();
      const emailMatch = tech.email && log.userEmail && tech.email.toLowerCase() === log.userEmail.toLowerCase();
      const nameMatch = tech.name && log.userName && tech.name.toLowerCase() === log.userName.toLowerCase();

      return (empIdMatch || emailMatch || nameMatch) && log.type === 'punch_in';
    });

    if (techPunches.length === 0) {
      // No punch-in yet. Has the shift started?
      // Shift time format: e.g. "08:00 - 17:00"
      const timeParts = shift.time.split('-');
      const startTimeStr = timeParts[0]?.trim() || '08:00';
      const [shStr, smStr] = startTimeStr.split(':');
      
      const shiftStart = new Date(shift.date);
      shiftStart.setHours(parseInt(shStr) || 8, parseInt(smStr) || 0, 0, 0);

      const now = new Date();
      // If the shift started more than 2 hours ago and no punch-in is registered, assume Absent
      if (now.getTime() - shiftStart.getTime() > 2 * 60 * 60 * 1000) {
        return { status: 'Absent' as const, details: 'No punch-in recorded (Shift started >2h ago)', punchTime: null };
      }
      return { status: 'Scheduled' as const, details: 'Awaiting punch-in...', punchTime: null };
    }

    // Sort punches by timestamp asc to find the earliest
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

    // Grace period of 15 minutes
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

  // Weekly Timeline Helpers
  const getDaysOfWeek = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const handleTodayWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
    setSelectedDateStr(new Date().toISOString().slice(0, 10));
  };

  const getLocalDateString = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            Scheduling & Dispatch Board
          </h3>
          <p className="text-xs text-slate-400 mt-1">Assign field engineers to active substations and grid hubs</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-900">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-[0_2px_8px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-[0_2px_8px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Timeline
            </button>
          </div>

          {isAdmin && (
            <button 
              onClick={() => {
                setSelectedTechId('');
                setSelectedProjectId('');
                setSelectedDateStr(new Date().toISOString().slice(0, 10));
                setShowAddForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg ml-auto sm:ml-0"
            >
              <UserPlus className="w-4 h-4" />
              Create Shift
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Swapper */}
      <div className="flex xl:hidden bg-slate-950/60 p-1.5 rounded-xl border border-slate-900 w-full">
        <button
          onClick={() => setMobileTab('board')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all ${
            mobileTab === 'board'
              ? 'bg-slate-900 text-cyan-400 border border-white/5 shadow-md'
              : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          {viewMode === 'month' ? 'Month Calendar' : 'Weekly Timeline'}
        </button>
        <button
          onClick={() => setMobileTab('logs')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all relative ${
            mobileTab === 'logs'
              ? 'bg-slate-900 text-cyan-400 border border-white/5 shadow-md'
              : 'text-slate-450 hover:text-slate-200'
          }`}
        >
          Duty Logs ({schedules.filter(s => s.date === selectedDateStr).length})
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Calendar or Timeline) */}
        <div className={`xl:col-span-2 ${mobileTab !== 'board' ? 'hidden xl:block' : ''}`}>
          
          {viewMode === 'month' ? (
            /* Month Calendar View */
            <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-4">
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

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-505 uppercase tracking-widest py-2">
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
                      onClick={() => {
                        setSelectedDateStr(dateStr);
                        // Auto swap to logs tab on mobile so user sees the details immediately
                        setMobileTab('logs');
                      }}
                      className={`aspect-square p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-cyan-955/40 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400' 
                          : 'bg-slate-950/45 border-slate-900 hover:border-slate-800 text-slate-350'
                      }`}
                    >
                      <span className="font-bold text-xs">{day}</span>
                      <div className="flex flex-wrap gap-0.5 justify-end mt-1 overflow-hidden">
                        {dayShifts.slice(0, 3).map((s, sIdx) => {
                          const auto = getAutoStatus(s);
                          const currentStatus = s.status;
                          
                          // Determine color indicator based on status
                          const badgeColor = 
                            currentStatus === 'On Time' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            currentStatus === 'Delayed' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                            currentStatus === 'Absent' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                            'bg-cyan-500/20 border-cyan-500/30 text-cyan-400';

                          return (
                            <span 
                              key={s.id || sIdx}
                              className={`w-4 h-4 rounded-full text-[8px] font-extrabold flex items-center justify-center border ${badgeColor}`}
                              title={`${s.technicianName} ➜ ${s.projectName} (${currentStatus})`}
                            >
                              {s.technicianName.slice(0, 2).toUpperCase()}
                            </span>
                          );
                        })}
                        {dayShifts.length > 3 && (
                          <span className="text-[8px] font-bold text-slate-500">+{dayShifts.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Weekly Technician Timeline View (Gantt-Style) */
            <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-5">
              
              {/* Timeline Header controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Resource Timeline</h4>
                  <span className="text-slate-100 text-sm font-semibold mt-1 block">
                    {getDaysOfWeek(currentWeekStart)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {getDaysOfWeek(currentWeekStart)[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrevWeek}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev Week
                  </button>
                  <button 
                    onClick={handleTodayWeek}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-100 text-xs font-semibold transition-colors"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNextWeek}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    Next Week
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll Timeline Table */}
              <div className="overflow-x-auto scrollbar-thin -webkit-overflow-scrolling-touch">
                <div className="min-w-[760px] pb-2">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-8 gap-2 pb-3 border-b border-slate-900/60 text-center font-mono">
                    <div className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      Field Engineers
                    </div>
                    {getDaysOfWeek(currentWeekStart).map((day, idx) => {
                      const dayStr = getLocalDateString(day);
                      const isToday = dayStr === getLocalDateString(new Date());
                      return (
                        <div 
                          key={idx} 
                          className={`py-1.5 rounded-lg text-center flex flex-col items-center justify-center transition-colors ${
                            isToday ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-450' : 'text-slate-400'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-semibold">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-xs font-bold">{day.getDate()}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Body */}
                  {teamList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No technicians registered.</div>
                  ) : (
                    <div className="divide-y divide-slate-900/40 space-y-2.5 mt-3">
                      {teamList.map((tech) => {
                        return (
                          <div key={tech.id} className="grid grid-cols-8 gap-2 items-center py-1.5">
                            {/* Tech Column */}
                            <div className="flex items-center gap-2 pr-1.5">
                              <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-350 shadow-inner flex-shrink-0">
                                {tech.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{tech.name}</p>
                                <span className="text-[9px] text-slate-500 font-mono block truncate">{tech.role}</span>
                              </div>
                            </div>

                            {/* Daily Slots */}
                            {getDaysOfWeek(currentWeekStart).map((day, dIdx) => {
                              const dayStr = getLocalDateString(day);
                              const dayShifts = schedules.filter(
                                s => s.technicianId === tech.id && s.date === dayStr
                              );

                              return (
                                <div 
                                  key={dIdx} 
                                  className="h-[68px] relative rounded-xl transition-all"
                                >
                                  {dayShifts.length > 0 ? (
                                    <div className="space-y-1.5 h-full overflow-y-auto pr-0.5 scrollbar-thin">
                                      {dayShifts.map((shift) => {
                                        const status = shift.status;
                                        const badgeColor = 
                                          status === 'On Time' ? 'border-green-500/20 text-green-400 bg-green-950/20' :
                                          status === 'Delayed' ? 'border-amber-500/20 text-amber-400 bg-amber-950/20' :
                                          status === 'Absent' ? 'border-rose-500/20 text-rose-400 bg-rose-950/20' :
                                          'border-cyan-500/20 text-cyan-400 bg-cyan-950/20';

                                        return (
                                          <button
                                            key={shift.id}
                                            onClick={() => {
                                              setSelectedDateStr(shift.date);
                                              setMobileTab('logs');
                                            }}
                                            className="w-full text-left p-1.5 bg-slate-900/50 border border-white/5 rounded-lg hover:border-cyan-500/30 transition-all relative group flex flex-col justify-between h-full"
                                          >
                                            {isAdmin && (
                                              <span 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteShift(shift.id);
                                                }}
                                                className="absolute top-1 right-1 p-0.5 rounded bg-slate-950/80 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </span>
                                            )}
                                            <span className="text-[9px] font-bold text-slate-100 truncate block w-11/12 leading-tight">
                                              {shift.projectName}
                                            </span>
                                            <div className="flex items-center justify-between mt-auto gap-0.5">
                                              <span className="text-[7.5px] text-slate-500 font-mono truncate max-w-[28px]">
                                                {shift.time.split('-')[0].trim()}
                                              </span>
                                              <span className={`text-[7px] font-extrabold px-1 rounded border scale-90 origin-right ${badgeColor}`}>
                                                {status.slice(0, 4)}
                                              </span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    /* Dotted blank state to click and create */
                                    isAdmin ? (
                                      <button
                                        onClick={() => {
                                          setSelectedTechId(tech.id);
                                          setSelectedDateStr(dayStr);
                                          setShowAddForm(true);
                                        }}
                                        className="w-full h-full border border-dashed border-slate-900 hover:border-cyan-500/20 hover:bg-cyan-500/5 rounded-xl flex items-center justify-center transition-all group cursor-pointer text-slate-800 hover:text-cyan-400"
                                        title="Quick Assign Shift"
                                      >
                                        <Plus className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    ) : (
                                      <div className="w-full h-full border border-slate-950/20 rounded-xl bg-slate-950/10" />
                                    )
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Duty Logs Detail sidebar) */}
        <div className={`space-y-6 flex flex-col ${mobileTab !== 'logs' ? 'hidden xl:flex' : ''}`}>
          
          <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col min-h-[420px]">
            <div className="pb-3 border-b border-slate-800 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Duty Logs</h4>
                <span className="text-slate-200 text-sm font-semibold mt-1 block">
                  {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <span className="text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 font-bold text-slate-450">
                {selectedDateShifts.length} Shift(s)
              </span>
            </div>

            {selectedDateShifts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Clock className="w-12 h-12 text-slate-800 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No shifts scheduled for this date</p>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setSelectedTechId('');
                      setSelectedProjectId('');
                      setShowAddForm(true);
                    }}
                    className="mt-3 text-[10px] text-cyan-400 hover:underline font-bold"
                  >
                    + Add Dispatch Assignment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                {selectedDateShifts.map((s) => {
                  const autoMatch = getAutoStatus(s);
                  const isSyncNeeded = autoMatch.status !== s.status;

                  return (
                    <div 
                      key={s.id} 
                      className="p-4.5 bg-slate-950/45 border border-slate-900 rounded-2xl relative group hover:border-slate-800/80 transition-all flex flex-col gap-3"
                    >
                      {/* Cancel Shift Trigger */}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteShift(s.id)}
                          className="absolute top-4.5 right-4.5 p-1 text-slate-500 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Technician & Project site info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-350 flex-shrink-0 shadow-inner">
                          {s.technicianName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-sm text-slate-100 leading-snug truncate">{s.technicianName}</h5>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-cyan-500 flex-shrink-0" />
                            <span className="truncate">{s.projectName}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-mono flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-slate-650" />
                            {s.time}
                          </span>
                        </div>
                      </div>

                      {/* Live Reconciled Status Card */}
                      <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-900 text-[10.5px] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Punch-in Verification:</span>
                          <span className={`font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                            autoMatch.status === 'On Time' ? 'border-green-500/10 text-green-400 bg-green-500/5' :
                            autoMatch.status === 'Delayed' ? 'border-amber-500/10 text-amber-400 bg-amber-500/5' :
                            autoMatch.status === 'Absent' ? 'border-rose-500/10 text-rose-400 bg-rose-500/5' :
                            'border-slate-800 text-slate-450 bg-slate-950/20'
                          }`}>
                            {autoMatch.status === 'On Time' && <CheckCircle2 className="w-3 h-3" />}
                            {autoMatch.status === 'Delayed' && <AlertTriangle className="w-3 h-3" />}
                            {autoMatch.status}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {autoMatch.details}
                        </p>

                        {/* Admin Action to Sync live status to db */}
                        {isAdmin && isSyncNeeded && (
                          <button
                            disabled={syncingShiftId === s.id}
                            onClick={() => handleSyncStatus(s.id, autoMatch.status)}
                            className="mt-1 w-full py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-[9.5px] text-cyan-400 font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {syncingShiftId === s.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Sync Shift Status to Verified
                          </button>
                        )}
                      </div>

                      {/* Manual Status selection override */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900/60 mt-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Database Status:</span>
                        
                        {isAdmin ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveStatusDropdown(activeStatusDropdown === s.id ? null : s.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border bg-slate-950 cursor-pointer flex items-center gap-1.5 transition-colors ${
                                s.status === 'On Time' ? 'border-green-500/30 text-green-400 hover:bg-green-500/5' :
                                s.status === 'Delayed' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/5' :
                                s.status === 'Absent' ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5' :
                                'border-slate-800 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              {s.status}
                              <ChevronDown className="w-3 h-3 text-slate-500" />
                            </button>
                            <AnimatePresence>
                              {activeStatusDropdown === s.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdown(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    className="absolute right-0 bottom-full mb-1.5 z-20 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl space-y-0.5 min-w-[110px]"
                                  >
                                    {(['Scheduled', 'On Time', 'Delayed', 'Absent'] as const).map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          handleUpdateStatus(s.id, opt);
                                          setActiveStatusDropdown(null);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-between ${
                                          s.status === opt 
                                            ? 'bg-cyan-500/10 text-cyan-400' 
                                            : 'text-slate-350 hover:bg-slate-950'
                                        }`}
                                      >
                                        {opt}
                                        {s.status === opt && <Check className="w-3 h-3 text-cyan-400" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border uppercase tracking-wider ${
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
                  );
                })}
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
                            className="absolute z-20 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                            style={{ contentVisibility: 'auto' }}
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
                            className="absolute z-20 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1.5 space-y-0.5"
                            style={{ contentVisibility: 'auto' }}
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
