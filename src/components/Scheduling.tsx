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
import { auth, db } from '../firebase';


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

// Helper to calculate left and width percentages for daily timeline visualization (12 AM - 12 AM 24h window)
const getShiftTimelinePosition = (timeStr: string) => {
  const startHourRef = 0; // 12 AM
  const endHourRef = 24; // 12 AM next day
  const totalHours = 24;

  try {
    const parts = timeStr.split('-');
    if (parts.length !== 2) return { left: '33.33%', width: '37.5%', isOutOfRange: false };
    const [start, end] = parts.map(p => p.trim());
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let startDecimal = startH + (startM || 0) / 60;
    let endDecimal = endH + (endM || 0) / 60;
    
    // Support overnight shifts visually cap at end of day
    if (endDecimal < startDecimal) {
      endDecimal = 24;
    }
    
    const leftPercent = Math.max(0, Math.min(100, ((startDecimal - startHourRef) / totalHours) * 100));
    const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((endDecimal - startDecimal) / totalHours) * 100));
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%`, isOutOfRange: false };
  } catch {
    return { left: '33.33%', width: '37.5%', isOutOfRange: false };
  }
};

export default function Scheduling() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  
  // Memoize visible team members based on admin status (admins see all workload, technicians see only their own)
  const visibleTeamList = React.useMemo(() => {
    if (isAdmin) {
      return teamList;
    }
    if (userProfile) {
      return teamList.filter(t => t.id === userProfile.id || t.email?.toLowerCase() === userProfile.email?.toLowerCase());
    }
    const authEmail = auth?.currentUser?.email;
    if (authEmail) {
      return teamList.filter(t => t.email?.toLowerCase() === authEmail.toLowerCase());
    }
    return [];
  }, [teamList, isAdmin, userProfile]);

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

  // Zoom and Details Modal States
  const [zoomLevel, setZoomLevel] = useState(1400);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<Shift | null>(null);

  // View mode for Admins ('timeline' or 'list')
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'list' : 'timeline';
    }
    return 'timeline';
  });

  // Helper to check if a proposed shift time overlaps with any existing shift for the technician on that day
  const checkOverlap = (techId: string, dateStr: string, newTimeStr: string, excludeShiftId?: string) => {
    try {
      const parseTime = (tStr: string) => {
        const parts = tStr.split('-');
        if (parts.length !== 2) return null;
        const [start, end] = parts.map(p => p.trim());
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        let startDec = startH + (startM || 0) / 60;
        let endDec = endH + (endM || 0) / 60;
        if (endDec < startDec) endDec = 24; // cap overnight shifts
        return { startDec, endDec };
      };

      const newTimes = parseTime(newTimeStr);
      if (!newTimes) return false;

      return schedules.some(s => {
        if (s.id === excludeShiftId) return false;
        if (s.technicianId !== techId || s.date !== dateStr) return false;
        const existingTimes = parseTime(s.time);
        if (!existingTimes) return false;

        // Overlap: start1 < end2 && start2 < end1
        return newTimes.startDec < existingTimes.endDec && existingTimes.startDec < newTimes.endDec;
      });
    } catch {
      return false;
    }
  };

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

  // Auto-verify scheduled shifts based on live punch logs (runs automatically to ensure database updates)
  useEffect(() => {
    if (loading || !db) return;

    // Filter shifts that are currently 'Scheduled' and need verification
    // Admins can verify any shift; non-admins (technicians) only auto-verify their own shifts
    const scheduledShifts = schedules.filter(s => {
      if (s.status !== 'Scheduled') return false;
      if (isAdmin) return true;
      const myIds = visibleTeamList.map(t => t.id);
      return myIds.includes(s.technicianId);
    });
    
    if (scheduledShifts.length === 0) return;

    const performAutoVerify = async () => {
      for (const shift of scheduledShifts) {
        const autoMatch = getAutoStatus(shift);
        // If calculated status changed from 'Scheduled' to 'On Time', 'Delayed', or 'Absent'
        if (autoMatch.status !== 'Scheduled') {
          try {
            await updateDoc(doc(db, 'schedules', shift.id), { status: autoMatch.status });
            
            // Log verification in activities logs
            try {
              await addDoc(collection(db, 'activities'), {
                title: 'Shift Auto-Verified',
                desc: `Automatically verified shift for ${shift.technicianName} at ${shift.projectName} as ${autoMatch.status}`,
                type: 'settings',
                timestamp: Timestamp.now()
              });
            } catch (actErr) {
              console.warn("Failed to log auto-verify activity:", actErr);
            }
          } catch (err) {
            console.error(`Failed to auto-verify shift ${shift.id}:`, err);
          }
        }
      }
    };

    // Debounce to allow multiple logs or snapshots to stabilize
    const timer = setTimeout(() => {
      performAutoVerify();
    }, 2000);

    return () => clearTimeout(timer);
  }, [schedules, attendanceLogs, teamList, loading, isAdmin, visibleTeamList]);

  // Keep selected shift details in sync with live schedules list
  useEffect(() => {
    if (selectedShiftForDetails) {
      const liveShift = schedules.find(s => s.id === selectedShiftForDetails.id);
      if (liveShift && JSON.stringify(liveShift) !== JSON.stringify(selectedShiftForDetails)) {
        setSelectedShiftForDetails(liveShift);
      }
    }
  }, [schedules, selectedShiftForDetails]);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId || !selectedProjectId || !selectedDateStr) return;

    const hasOverlap = checkOverlap(selectedTechId, selectedDateStr, shiftTime);
    if (hasOverlap) {
      if (!window.confirm("Warning: This shift overlaps with an existing shift scheduled for this technician. Do you want to assign it anyway?")) {
        return;
      }
    }

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

    const timeParts = shift.time.split('-');
    const startTimeStr = timeParts[0]?.trim() || '08:00';
    const endTimeStr = timeParts[1]?.trim() || '17:00';
    
    const [shStr, smStr] = startTimeStr.split(':');
    const [ehStr, emStr] = endTimeStr.split(':');
    
    const parsedStartHour = parseInt(shStr);
    const startHour = isNaN(parsedStartHour) ? 8 : parsedStartHour;
    const parsedStartMin = parseInt(smStr);
    const startMin = isNaN(parsedStartMin) ? 0 : parsedStartMin;
    
    const parsedEndHour = parseInt(ehStr);
    const endHour = isNaN(parsedEndHour) ? 17 : parsedEndHour;
    const parsedEndMin = parseInt(emStr);
    const endMin = isNaN(parsedEndMin) ? 0 : parsedEndMin;

    const shiftStart = new Date(shift.date);
    shiftStart.setHours(startHour, startMin, 0, 0);
    
    const shiftEnd = new Date(shift.date);
    shiftEnd.setHours(endHour, endMin, 0, 0);
    
    // Support overnight shifts where end time hour < start time hour
    if (shiftEnd.getTime() < shiftStart.getTime()) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const windowStartMs = shiftStart.getTime() - 30 * 60 * 1000;
    const windowEndMs = shiftEnd.getTime();

    // Helper to format date as YYYY-MM-DD
    const getFormattedDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const dateStartStr = getFormattedDate(new Date(windowStartMs));
    const dateEndStr = getFormattedDate(new Date(windowEndMs));
    const searchDates = Array.from(new Set([dateStartStr, dateEndStr]));

    // Retrieve punch_ins from lookup table for the relevant dates
    let techPunches: any[] = [];
    for (const searchDate of searchDates) {
      const keys = [];
      if (tech.employeeId) keys.push(`${searchDate}_${tech.employeeId.toLowerCase()}`);
      if (tech.email) keys.push(`${searchDate}_${tech.email.toLowerCase()}`);
      if (tech.name) keys.push(`${searchDate}_${tech.name.toLowerCase()}`);
      
      for (const key of keys) {
        if (attendanceLookup[key]) {
          const punches = attendanceLookup[key].filter((l: any) => l.type === 'punch_in');
          techPunches.push(...punches);
        }
      }
    }

    // Filter to only include punch-ins within the shift window
    const validPunches = techPunches.filter(p => {
      const punchTime = new Date(p.timestamp).getTime();
      return punchTime >= windowStartMs && punchTime <= windowEndMs;
    });

    if (validPunches.length === 0) {
      const now = new Date();
      const isAbsent = (now.getTime() - shiftStart.getTime() > 2 * 60 * 60 * 1000) || (now.getTime() > windowEndMs);
      if (isAbsent) {
        return { status: 'Absent' as const, details: 'No punch-in recorded', punchTime: null };
      }
      return { status: 'Scheduled' as const, details: 'Awaiting punch-in...', punchTime: null };
    }

    validPunches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const earliestPunch = validPunches[0];
    const punchTimeObj = new Date(earliestPunch.timestamp);
    const punchTimeStr = punchTimeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Calculate latency (punchTime - shiftStart)
    const diffMinutes = Math.floor((punchTimeObj.getTime() - shiftStart.getTime()) / (1000 * 60));

    if (diffMinutes <= 30) {
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

  // Date/Week Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - (isAdmin ? 1 : 7));
    setSelectedDateStr(getLocalDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + (isAdmin ? 1 : 7));
    setSelectedDateStr(getLocalDateString(d));
  };

  const handleToday = () => {
    setSelectedDateStr(getLocalDateString(new Date()));
  };

  // Helper to generate the 7 days of the week containing the selected date (Monday to Sunday)
  const weekDays = React.useMemo(() => {
    const refDate = new Date(selectedDateStr);
    const day = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of the week
    const monday = new Date(refDate.setDate(diff));
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDateStr]);

  // Memoized: Shifts filtered by selected date
  const selectedDateShifts = React.useMemo(() => {
    return schedules.filter(s => s.date === selectedDateStr);
  }, [schedules, selectedDateStr]);

  // Memoized: Shifts pre-grouped by technician ID for the selected date
  const shiftsByTechLookup = React.useMemo(() => {
    const lookup: Record<string, Shift[]> = {};
    selectedDateShifts.forEach(s => {
      if (!lookup[s.technicianId]) lookup[s.technicianId] = [];
      lookup[s.technicianId].push(s);
    });
    return lookup;
  }, [selectedDateShifts]);

  // Memoized: Weekly hours lookup dictionary for all technicians
  const weeklyHoursLookup = React.useMemo(() => {
    const lookup: Record<string, number> = {};
    
    const refDate = new Date(selectedDateStr);
    const day = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(refDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    schedules.forEach(s => {
      const shiftDate = new Date(s.date);
      if (shiftDate >= monday && shiftDate <= sunday) {
        const hours = calculateShiftHours(s.time);
        lookup[s.technicianId] = (lookup[s.technicianId] || 0) + hours;
      }
    });

    return lookup;
  }, [schedules, selectedDateStr]);

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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            {isAdmin ? "Daily Hours & Dispatch Planner" : "My Work Schedule"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin 
              ? "Plan engineer hours, balance weekly workloads, and sync verified attendance logs" 
              : "View your weekly shift timetable, shift details, and track attendance status"}
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setSelectedTechId('');
              setSelectedProjectId('');
              setShowAddForm(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
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
              {isAdmin ? (
                new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
              ) : (
                `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              )}
            </span>
          </div>

          {/* Quick Date Selector & Daily Hours Stats */}
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle Switch */}
            {isAdmin && (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900">
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'timeline'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  List
                </button>
              </div>
            )}

            {/* Timeline Zoom Slider */}
            {isAdmin && viewMode === 'timeline' && (
              <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-900 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Timeline Zoom:</span>
                <input 
                  type="range" 
                  min="1200" 
                  max="3000" 
                  step="100"
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-24 accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                />
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{Math.round((zoomLevel / 1400) * 100)}%</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Jump to Date:</span>
              <input 
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-2">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                  {isAdmin ? "Today's Schedule load" : "Weekly Workload"}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {(() => {
                    if (isAdmin) {
                      const totalHours = selectedDateShifts.reduce((sum, s) => sum + calculateShiftHours(s.time), 0);
                      return `${totalHours} hrs (${selectedDateShifts.length} shifts)`;
                    } else {
                      const myId = userProfile?.id || visibleTeamList[0]?.id;
                      const weeklyHours = myId ? getWeeklyHoursForTech(myId, selectedDateStr) : 0;
                      const myWeeklyShifts = schedules.filter(s => {
                        if (s.technicianId !== myId) return false;
                        const shiftDate = new Date(s.date);
                        return shiftDate >= weekDays[0] && shiftDate <= weekDays[6];
                      });
                      return `${weeklyHours} hrs (${myWeeklyShifts.length} shifts)`;
                    }
                  })()}
                </span>
              </div>
              <Clock className="w-4 h-4 text-cyan-400 opacity-60" />
            </div>
          </div>
        </div>

        {/* Daily Timeline Scheduler */}
        {isAdmin ? (
          viewMode === 'timeline' ? (
            <div className="space-y-4">
              {/* Scrollable Container with sticky columns */}
              <div className="overflow-x-auto select-none pb-2 scrollbar-thin">
                <div style={{ minWidth: `${zoomLevel}px` }} className="px-1 space-y-4">
                  
                  {/* Timeline Header Row (Hours Labels) */}
                  <div className="flex gap-4 items-center">
                    {/* Sticky header column for Technician Workload label */}
                    <div className="w-[200px] sticky left-0 bg-[#0d1423] z-25 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 select-none flex-shrink-0 border-r border-transparent">
                      Technician Workload
                    </div>
                    
                    {/* Hour labels (00:00 to 24:00) */}
                    <div className="flex-grow relative h-6">
                      {(() => {
                        const hoursRange = Array.from({ length: 25 }, (_, i) => i);
                        return hoursRange.map((h, idx) => {
                          const label = h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
                          const shouldShowLabel = h % 2 === 0; // Show every 2 hours to avoid clutter
                          
                          return shouldShowLabel ? (
                            <span 
                              key={h} 
                              style={{ left: `${(idx / 24) * 100}%` }}
                              className="absolute -translate-x-1/2 text-[9px] font-mono font-bold text-slate-500 whitespace-nowrap select-none"
                            >
                              {label}
                            </span>
                          ) : null;
                        });
                      })()}
                    </div>
                  </div>

                  {/* Technician Dispatch Timeline List */}
                  <div className="space-y-3">
                    {visibleTeamList.map((tech) => {
                      const techShifts = shiftsByTechLookup[tech.id] || [];
                      const weeklyHours = weeklyHoursLookup[tech.id] || 0;
                      const isOvertimeLimit = weeklyHours > 48;

                      return (
                        <div 
                          key={tech.id} 
                          className="group flex gap-4 items-center p-3 rounded-2xl border border-slate-900 bg-slate-950/15 hover:border-slate-800 hover:bg-slate-950/20 transition-all"
                        >
                          {/* Col 1: Tech Profile Details (Sticky Left) */}
                          <div className="w-[200px] flex-shrink-0 sticky left-0 bg-[#0d1423] group-hover:bg-[#121b30] border-r border-slate-900/60 pr-4 z-20 flex items-center gap-2.5 transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner select-none flex-shrink-0">
                              {tech.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11.5px] font-bold text-slate-200 truncate leading-tight">{tech.name}</h4>
                              <p className="text-[9.5px] text-slate-500 font-mono truncate leading-none mt-0.5">{tech.role}</p>
                              
                              {/* Workload hours count */}
                              <span className={`inline-flex items-center gap-1 mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                isOvertimeLimit 
                                  ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400' 
                                  : 'bg-slate-900 border border-slate-800 text-slate-400'
                              }`}>
                                Week load: {weeklyHours}h {isOvertimeLimit ? '⚠️' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Col 2: Absolute positioned daily timeline (Flex-grow) */}
                          <div className="flex-grow">
                            <div className="relative h-[60px] bg-slate-950/45 border border-slate-900/80 rounded-xl overflow-hidden flex items-center">
                              
                              {/* Hour Dividers / Background Grid (24-hour lines) */}
                              <div className="absolute inset-0 flex pointer-events-none z-0">
                                {Array.from({ length: 25 }).map((_, idx) => (
                                  <div 
                                    key={idx} 
                                    style={{ left: `${(idx / 24) * 100}%` }} 
                                    className="absolute top-0 bottom-0 w-px bg-slate-900/30 border-r border-dashed border-slate-800/10" 
                                  />
                                ))}
                              </div>

                              {/* Click-to-assign background layer */}
                              <div 
                                className="absolute inset-0 z-5 cursor-crosshair group/track"
                                onClick={(e) => {
                                  // Prevent modal trigger if clicking directly on a shift-card
                                  if ((e.target as HTMLElement).closest('.shift-card')) return;
                                  
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickX = e.clientX - rect.left;
                                  const clickPercent = clickX / rect.width;
                                  const clickedHour = Math.floor(clickPercent * 24);
                                  
                                  const startHourStr = String(clickedHour).padStart(2, '0') + ':00';
                                  const endHourStr = String(Math.min(24, clickedHour + 8)).padStart(2, '0') + ':00';
                                  
                                  setSelectedTechId(tech.id);
                                  setShiftTime(`${startHourStr} - ${endHourStr}`);
                                  setShowAddForm(true);
                                }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/track:opacity-100 bg-cyan-500/[0.02] transition-opacity duration-150 pointer-events-none select-none">
                                  <span className="text-[10px] text-cyan-400/80 font-semibold flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Click slot to assign shift
                                  </span>
                                </div>
                              </div>

                              {/* Absolute positioned shift cards */}
                              {techShifts.map((sItem) => {
                                const { left, width } = getShiftTimelinePosition(sItem.time);
                                const shiftHours = calculateShiftHours(sItem.time);
                                const autoMatch = getAutoStatus(sItem);
                                const displayStatus = sItem.status === 'Scheduled' ? autoMatch.status : sItem.status;

                                return (
                                  <div
                                    key={sItem.id}
                                    style={{ left, width }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedShiftForDetails(sItem);
                                    }}
                                    className={`shift-card absolute h-11 rounded-lg border transition-all cursor-pointer z-10 hover:brightness-110 shadow-lg ${
                                      shiftHours <= 1.5 ? 'px-1.5 flex items-center justify-center' : 'px-3 flex items-center justify-between'
                                    } ${
                                      displayStatus === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/15' :
                                      displayStatus === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15' :
                                      displayStatus === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15' :
                                      'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15'
                                    }`}
                                    title={`Click to view details: ${sItem.projectName} (${sItem.time})`}
                                  >
                                    {shiftHours <= 1.5 ? (
                                      /* Tier 1: Very short (<= 1.5h) - show 3-letter project code & status dot */
                                      <div className="min-w-0 flex items-center gap-1 w-full justify-between select-none">
                                        <MapPin className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                                        <span className="text-[9px] font-bold truncate leading-tight">
                                          {sItem.projectName.slice(0, 3).toUpperCase()}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          displayStatus === 'On Time' ? 'bg-green-500' :
                                          displayStatus === 'Delayed' ? 'bg-amber-500' :
                                          displayStatus === 'Absent' ? 'bg-rose-500' :
                                          'bg-cyan-500'
                                        }`} />
                                      </div>
                                    ) : shiftHours <= 3.0 ? (
                                      /* Tier 2: Medium-short (1.5h to 3h) - show truncated project name & status dot */
                                      <div className="min-w-0 flex items-center justify-between w-full select-none gap-2">
                                        <div className="min-w-0 flex-1 flex items-center gap-1">
                                          <MapPin className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                                          <span className="text-[9.5px] font-bold truncate leading-tight">{sItem.projectName}</span>
                                        </div>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          displayStatus === 'On Time' ? 'bg-green-500' :
                                          displayStatus === 'Delayed' ? 'bg-amber-500' :
                                          displayStatus === 'Absent' ? 'bg-rose-500' :
                                          'bg-cyan-500'
                                        }`} />
                                      </div>
                                    ) : (
                                      /* Tier 3: Long (> 3h) - show full layout with text label */
                                      <>
                                        <div className="min-w-0 flex-1 flex flex-col justify-center select-none">
                                          <div className="flex items-center gap-1 min-w-0">
                                            <MapPin className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                                            <span className="text-[9.5px] font-bold truncate leading-tight">{sItem.projectName}</span>
                                          </div>
                                          <span className="text-[8px] opacity-70 font-mono mt-0.5 leading-none">
                                            {sItem.time} ({shiftHours}h)
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1 select-none pointer-events-none">
                                          <span className={`text-[7.5px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-slate-900/80 leading-none ${
                                            displayStatus === 'On Time' ? 'border-green-500/20 text-green-400' :
                                            displayStatus === 'Delayed' ? 'border-amber-500/20 text-amber-400' :
                                            displayStatus === 'Absent' ? 'border-rose-500/20 text-rose-400' :
                                            'border-slate-800 text-slate-400'
                                          }`}>
                                            {displayStatus === 'On Time' ? 'ON TIME' :
                                             displayStatus === 'Delayed' ? 'LATE' :
                                             displayStatus === 'Absent' ? 'ABSENT' : 'SCHED'}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Admin List View (Grouped Technician Agenda Blocks) */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleTeamList.map((tech) => {
                  const techShifts = shiftsByTechLookup[tech.id] || [];
                  const weeklyHours = weeklyHoursLookup[tech.id] || 0;
                  const isOvertimeLimit = weeklyHours > 48;

                  return (
                    <div 
                      key={tech.id} 
                      className="p-5 rounded-2xl border border-slate-900 bg-slate-950/20 hover:bg-slate-950/40 transition-all space-y-4"
                    >
                      {/* Tech Profile Summary */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 select-none">
                            {tech.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 leading-tight">{tech.name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 leading-none">{tech.role}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                          isOvertimeLimit 
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}>
                          Week load: {weeklyHours}h {isOvertimeLimit ? '⚠️' : ''}
                        </span>
                      </div>

                      {/* Technician Agenda Shifts */}
                      <div className="space-y-3">
                        {techShifts.length === 0 ? (
                          <div className="text-center py-4 bg-slate-950/10 border border-slate-900/40 rounded-xl">
                            <span className="text-[10px] text-slate-500 font-mono">Rest Day / Off</span>
                          </div>
                        ) : (
                          techShifts.map((shift) => {
                            const autoMatch = getAutoStatus(shift);
                            const displayStatus = shift.status === 'Scheduled' ? autoMatch.status : shift.status;
                            return (
                              <div
                                key={shift.id}
                                onClick={() => setSelectedShiftForDetails(shift)}
                                className={`p-3.5 rounded-xl border bg-slate-950/40 hover:bg-slate-950/60 transition-all cursor-pointer space-y-3 hover:-translate-y-0.5 duration-150 ${
                                  displayStatus === 'On Time' ? 'border-green-500/15 text-green-400' :
                                  displayStatus === 'Delayed' ? 'border-amber-500/15 text-amber-400' :
                                  displayStatus === 'Absent' ? 'border-rose-500/15 text-rose-400' :
                                  'border-cyan-500/15 text-cyan-400'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Project Site</span>
                                    <h5 className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                      {shift.projectName}
                                    </h5>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border bg-slate-950/80 ${
                                    displayStatus === 'On Time' ? 'border-green-500/20 text-green-400' :
                                    displayStatus === 'Delayed' ? 'border-amber-500/20 text-amber-500' :
                                    displayStatus === 'Absent' ? 'border-rose-500/20 text-rose-400' :
                                    'border-slate-800 text-slate-400'
                                  }`}>
                                    {displayStatus}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] border-t border-slate-900/40 pt-2 font-mono">
                                  <div className="text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500 opacity-60" />
                                    {shift.time}
                                  </div>
                                  <div className="text-slate-300 font-bold">
                                    {calculateShiftHours(shift.time)} hrs
                                  </div>
                                </div>

                                <div className="text-[9.5px] text-slate-500 bg-slate-950/60 p-2 rounded-lg border border-slate-900/60 leading-normal italic font-mono truncate">
                                  {autoMatch.details}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* Timetable Grid View for Non-Admin Technicians */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {weekDays.map((dayDate) => {
                const dateStr = getLocalDateString(dayDate);
                const isTodayStr = getLocalDateString(new Date()) === dateStr;
                const myId = userProfile?.id || visibleTeamList[0]?.id;
                
                // Get all shifts for this specific day
                const dayShifts = schedules.filter(s => s.technicianId === myId && s.date === dateStr);
                
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                const monthName = dayDate.toLocaleDateString('en-US', { month: 'short' });
                
                return (
                  <div
                    key={dateStr}
                    className={`rounded-2xl border transition-all flex flex-col p-4 min-h-[200px] bg-slate-950/35 relative overflow-hidden ${
                      isTodayStr 
                        ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30' 
                        : 'border-slate-900/60 hover:border-slate-800'
                    }`}
                  >
                    {/* Visual glowing line for today */}
                    {isTodayStr && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-400" />
                    )}
                    
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-900/50 mb-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isTodayStr ? 'text-cyan-400' : 'text-slate-500'
                        }`}>
                          {dayName}
                        </span>
                        <span className="text-sm font-bold text-slate-100 mt-0.5 font-mono">
                          {monthName} {dayNum}
                        </span>
                      </div>
                      
                      {isTodayStr && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest leading-none">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Shifts for this day */}
                    <div className="flex-1 space-y-2">
                      {dayShifts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-6 text-center select-none opacity-40">
                          <span className="text-[10px] text-slate-500 font-mono font-semibold tracking-wider uppercase">Rest Day</span>
                        </div>
                      ) : (
                        dayShifts.map((shift) => {
                          const autoMatch = getAutoStatus(shift);
                          const displayStatus = shift.status === 'Scheduled' ? autoMatch.status : shift.status;
                          return (
                            <div
                              key={shift.id}
                              onClick={() => setSelectedShiftForDetails(shift)}
                              className={`p-3 rounded-xl border bg-slate-950/50 hover:bg-slate-950/80 transition-all cursor-pointer space-y-2 group/card text-left ${
                                displayStatus === 'On Time' ? 'border-green-500/15 hover:border-green-500/35' :
                                displayStatus === 'Delayed' ? 'border-amber-500/15 hover:border-amber-500/35' :
                                displayStatus === 'Absent' ? 'border-rose-500/15 hover:border-rose-500/35' :
                                'border-cyan-500/15 hover:border-cyan-500/35'
                              }`}
                              title="Click to view details"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                  <h5 className="text-[10.5px] font-bold text-slate-200 truncate leading-tight group-hover/card:text-cyan-300 transition-colors">
                                    {shift.projectName}
                                  </h5>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-slate-400 leading-none">
                                  <Clock className="w-2.5 h-2.5 text-cyan-500 opacity-60 flex-shrink-0" />
                                  <span>{shift.time}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-1 border-t border-slate-900/40 mt-1">
                                <span className="text-[8px] text-slate-500 font-mono">
                                  {calculateShiftHours(shift.time)} hrs
                                </span>
                                <span className={`inline-flex items-center rounded-full w-2 h-2 ${
                                  displayStatus === 'On Time' ? 'bg-green-500' :
                                  displayStatus === 'Delayed' ? 'bg-amber-500' :
                                  displayStatus === 'Absent' ? 'bg-rose-500' :
                                  'bg-cyan-500'
                                }`} title={displayStatus} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
              
              {/* Overlapping Warning Alert */}
              {(() => {
                const hasOverlap = checkOverlap(selectedTechId, selectedDateStr, shiftTime);
                if (hasOverlap) {
                  return (
                    <div className="p-3 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10.5px] leading-tight flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-rose-300">Overlapping Shift Warning</span>
                        This time slot conflicts with an existing assignment for this technician on this day.
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
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm"
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
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Shift Timing</label>
                  <input 
                    type="text"
                    value={shiftTime}
                    onChange={(e) => setShiftTime(e.target.value)}
                    required
                    placeholder="e.g. 08:00 - 17:00"
                    className="w-full bg-slate-955 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Dispatch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shift Details Modal */}
      <AnimatePresence>
        {selectedShiftForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm shadow-2xl"
              onClick={() => setSelectedShiftForDetails(null)}
            />
            
            {(() => {
              const shift = selectedShiftForDetails;
              const tech = teamList.find(t => t.id === shift.technicianId);
              const autoMatch = getAutoStatus(shift);
              const isSyncNeeded = autoMatch.status !== shift.status;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative w-full max-w-lg glass-card p-6 rounded-2xl shadow-2xl border border-white/10 z-10 space-y-6 text-slate-100"
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Shift Details</span>
                      <h4 className="text-lg font-bold mt-1 text-slate-100 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-cyan-400" />
                        {shift.projectName}
                      </h4>
                    </div>
                    <button 
                      onClick={() => setSelectedShiftForDetails(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Technician details card */}
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Technician</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-cyan-400 select-none">
                          {shift.technicianName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-200 truncate">{shift.technicianName}</h5>
                          <p className="text-[9px] text-slate-500 font-mono truncate">{tech?.role || 'Engineer'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Hours details card */}
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Schedule Time</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-8 h-8 text-cyan-500 opacity-60 p-1.5 bg-slate-900 border border-slate-800 rounded-lg" />
                        <div>
                          <h5 className="text-xs font-mono font-bold text-slate-200">{shift.time}</h5>
                          <p className="text-[9px] text-cyan-400 font-semibold">{calculateShiftHours(shift.time)} Hours Assigned</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Status & Attendance Log Matching */}
                  <div className="p-4 bg-slate-950/65 border border-slate-900 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Live Punch Matching</span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        shift.status === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        shift.status === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        shift.status === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        Current Status: {shift.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Auto Attendance Status:</span>
                        <span className="font-semibold text-slate-200 font-mono">{autoMatch.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Verified Punch Time:</span>
                        <span className="font-semibold text-slate-200 font-mono">{autoMatch.punchTime || 'No Punch-in Today'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-normal italic mt-1 pt-1.5 border-t border-slate-900/60 font-mono">
                        {autoMatch.details}
                      </div>
                    </div>

                    {/* Match sync warning */}
                    {isAdmin && isSyncNeeded && (
                      <div className="pt-2">
                        <button
                          disabled={syncingShiftId === shift.id}
                          onClick={async () => {
                            await handleSyncStatus(shift.id, autoMatch.status);
                            setSelectedShiftForDetails(prev => prev ? { ...prev, status: autoMatch.status } : null);
                          }}
                          className="w-full py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          {syncingShiftId === shift.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Sync Shift Status to verified punch ({autoMatch.status})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit Controls for Admins */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-900 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider block">Manual Status Override</span>
                          <div className="relative">
                            <select
                              value={shift.status}
                              onChange={async (e) => {
                                const newStat = e.target.value as Shift['status'];
                                await handleUpdateStatus(shift.id, newStat);
                                setSelectedShiftForDetails(prev => prev ? { ...prev, status: newStat } : null);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer min-w-[130px]"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="On Time">On Time</option>
                              <option value="Delayed">Delayed</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:text-right pt-2 sm:pt-0">
                          <button
                            onClick={async () => {
                              setSelectedShiftForDetails(null);
                              await handleDeleteShift(shift.id);
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                            Cancel Dispatch Shift
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
