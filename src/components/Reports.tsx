import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Clock, 
  Users, 
  MapPin, 
  Download, 
  Printer, 
  Search, 
  Loader2, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
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

export default function Reports() {
  const { isAdmin } = useOutletContext<any>();

  // If not admin, silently redirect to /dashboard to hide page existence
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter States
  const [startDateStr, setStartDateStr] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'On Time' | 'Delayed' | 'Absent'>('All');
  const [activeTab, setActiveTab] = useState<'shifts' | 'attendance'>('shifts');

  // Firebase Collections States
  const [schedules, setSchedules] = useState<Shift[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch collections
  useEffect(() => {
    if (!db) {
      // Mock data
      setTeamList([
        { id: '1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', role: 'Lead Electrician' },
        { id: '2', name: 'Sanjay Kumar', email: 'sanjay@apecpowersolutions.com', employeeId: 'APEC-1003', role: 'Safety Engineer' }
      ]);
      setSchedules([
        { id: '1', technicianId: '1', technicianName: 'Rahul Sharma', projectId: '1', projectName: 'Grid Substation Hubli', date: new Date().toISOString().slice(0, 10), time: '08:00 - 17:00', status: 'On Time' }
      ]);
      setAttendanceLogs([
        {
          id: 'mock-1',
          employeeId: 'APEC-1002',
          userName: 'Rahul Sharma',
          userEmail: 'rahul@apecpowersolutions.com',
          type: 'punch_in',
          timestamp: new Date().toISOString(),
          location: { address: 'Hubli Substation Entry' }
        }
      ]);
      setLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snap) => {
      setTeamList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    });

    return () => {
      unsubTeam();
      unsubSchedules();
      unsubAttendance();
    };
  }, []);

  // Helper to calculate duration in hours
  const calculateShiftHours = (timeStr: string): number => {
    try {
      const parts = timeStr.split('-');
      if (parts.length !== 2) return 8;
      const [start, end] = parts.map(p => p.trim());
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      let diffMins = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
      if (diffMins < 0) diffMins += 24 * 60; // overnight support
      return Math.round((diffMins / 60) * 10) / 10;
    } catch {
      return 8;
    }
  };

  // Quick preset ranges
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start = today;
      end = today;
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start.setDate(today.getDate() - 30);
    }

    setStartDateStr(start.toISOString().slice(0, 10));
    setEndDateStr(end.toISOString().slice(0, 10));
  };

  // Process filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const isWithinDates = s.date >= startDateStr && s.date <= endDateStr;
      if (!isWithinDates) return false;

      const matchesSearch = 
        s.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.projectName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesStatus;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [schedules, startDateStr, endDateStr, searchTerm, statusFilter]);

  const filteredAttendance = useMemo(() => {
    return attendanceLogs.filter(log => {
      if (!log.timestamp) return false;
      const logDateStr = log.timestamp.slice(0, 10);
      const isWithinDates = logDateStr >= startDateStr && logDateStr <= endDateStr;
      if (!isWithinDates) return false;

      const matchesSearch = 
        (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.employeeId && log.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [attendanceLogs, startDateStr, endDateStr, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    let totalShifts = filteredSchedules.length;
    let totalHours = 0;
    let onTime = 0;
    let delayed = 0;
    let absent = 0;
    let scheduled = 0;

    filteredSchedules.forEach(s => {
      totalHours += calculateShiftHours(s.time);
      if (s.status === 'On Time') onTime++;
      else if (s.status === 'Delayed') delayed++;
      else if (s.status === 'Absent') absent++;
      else if (s.status === 'Scheduled') scheduled++;
    });

    const checkedShifts = onTime + delayed + absent;
    const complianceRate = checkedShifts > 0 ? Math.round((onTime / checkedShifts) * 100) : 100;

    return {
      totalShifts,
      totalHours: Math.round(totalHours * 10) / 10,
      onTime,
      delayed,
      absent,
      scheduled,
      complianceRate
    };
  }, [filteredSchedules]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";

    if (activeTab === 'shifts') {
      csvContent = "data:text/csv;charset=utf-8," 
        + "Date,Technician,Project Site,Shift Hours,Duration (hrs),Sync Status\n"
        + filteredSchedules.map(s => `"${s.date}","${s.technicianName}","${s.projectName}","${s.time}",${calculateShiftHours(s.time)},"${s.status}"`).join("\n");
      fileName = `APEC_Shifts_Report_${startDateStr}_to_${endDateStr}.csv`;
    } else {
      csvContent = "data:text/csv;charset=utf-8," 
        + "Timestamp,Technician,Email,Access Code,Type,Location,Latitude,Longitude\n"
        + filteredAttendance.map(log => {
            const locStr = log.location?.address ? `"${log.location.address.replace(/"/g, '""')}"` : "Unknown";
            const lat = log.location?.latitude || "";
            const lng = log.location?.longitude || "";
            return `"${log.timestamp}","${log.userName || ''}","${log.userEmail || ''}","${log.employeeId || ''}","${log.type || ''}",${locStr},"${lat}","${lng}"`;
          }).join("\n");
      fileName = `APEC_Attendance_Report_${startDateStr}_to_${endDateStr}.csv`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a13]/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 print:bg-white print:text-black print:p-0">
      
      {/* Print Overrides Style */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          html, body, #root, .h-\\[100dvh\\], main, .flex-1, .max-w-7xl, .p-3, .p-6, .p-8 {
            background: white !important;
            background-color: white !important;
            color: #1e293b !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          aside, header, nav, .sidebar, button, input, select, .print\\:hidden {
            display: none !important;
          }
          .glass-card {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
          }
          .print-stats-grid > div {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 12px !important;
          }
          h1, h2, h3, h4, p, span, th, td {
            color: #0f172a !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 10px !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            text-align: left !important;
            font-size: 10px !important;
            word-break: break-word !important;
            white-space: normal !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          .truncate, td.max-w-\\[250px\\] {
            overflow: visible !important;
            text-overflow: unset !important;
            white-space: normal !important;
            max-width: none !important;
          }
          /* Custom status badge print colors for better readability on white paper */
          .text-green-400 {
            color: #15803d !important;
            background-color: #f0fdf4 !important;
            border-color: #bbf7d0 !important;
          }
          .text-amber-400 {
            color: #b45309 !important;
            background-color: #fef3c7 !important;
            border-color: #fde68a !important;
          }
          .text-rose-400 {
            color: #b91c1c !important;
            background-color: #fef2f2 !important;
            border-color: #fecaca !important;
          }
          .text-cyan-400 {
            color: #0369a1 !important;
            background-color: #f0f9ff !important;
            border-color: #bae6fd !important;
          }
          .text-indigo-400 {
            color: #4338ca !important;
            background-color: #eef2ff !important;
            border-color: #e0e7ff !important;
          }
        }
      `}} />

      {/* Dedicated Print Header (Only visible on paper print) */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
            <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain p-0.5" onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo.png';
            }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">APEC Power Solutions</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Enterprise Resource Planning</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-bold text-slate-900">{activeTab === 'shifts' ? 'Shift Dispatch Log' : 'Attendance Log'}</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono font-medium">Period: {startDateStr} to {endDateStr}</p>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] print:hidden">
        <div>
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Operations Center</span>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Operational & Attendance Reports
          </h3>
          <p className="text-xs text-slate-400 mt-1">Generated for dates: <span className="font-mono text-cyan-400 font-bold">{startDateStr}</span> to <span className="font-mono text-cyan-400 font-bold">{endDateStr}</span></p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Date preset selections & Custom dates inputs */}
      <div className="p-5 rounded-2xl glass-card border border-white/10 shadow-lg space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Quick presets buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presets:</span>
            {(['today', 'yesterday', 'week', 'month'] as const).map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-800 text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider cursor-pointer"
              >
                {preset === 'week' ? 'Last 7 Days' : preset === 'month' ? 'Last 30 Days' : preset}
              </button>
            ))}
          </div>

          {/* Custom selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From:</span>
              <input 
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To:</span>
              <input 
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-900/60">
          
          {/* Text Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search technician or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Status filter (only applicable when view shifts) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              disabled={activeTab !== 'shifts'}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="All">All Dispatch Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="On Time">On Time</option>
              <option value="Delayed">Delayed</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'shifts' 
                  ? 'bg-gradient-to-r from-cyan-500/15 to-cyan-400/5 text-cyan-400 border border-cyan-500/20 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shift Dispatches
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'attendance' 
                  ? 'bg-gradient-to-r from-cyan-500/15 to-cyan-400/5 text-cyan-400 border border-cyan-500/20 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Attendance History
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-stats-grid">
        
        {/* Total Persons Allotted */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allotted Personnel</span>
          <span className="text-2xl font-bold text-slate-100 font-mono">
            {filteredSchedules.map(s => s.technicianId).filter((v, i, a) => a.indexOf(v) === i).length}
          </span>
          <span className="text-[9px] text-slate-500">Across {stats.totalShifts} scheduled dispatches</span>
        </div>

        {/* Total Present */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Present</span>
          <span className="text-2xl font-bold text-slate-100 font-mono">
            {stats.onTime + stats.delayed}
          </span>
          <span className="text-[9px] text-slate-500">On-time: {stats.onTime} | Late: {stats.delayed}</span>
        </div>

        {/* Absence / Late rate */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incidents Summary</span>
          <div className="flex gap-4 text-xs font-mono font-bold">
            <span className="text-amber-400">{stats.delayed} LATE</span>
            <span className="text-rose-400">{stats.absent} ABSENT</span>
          </div>
          <span className="text-[9px] text-slate-500">Unresolved anomalies</span>
        </div>
      </div>

      {/* Main Tab Content Tables */}
      <div className="rounded-2xl glass-card border border-white/10 shadow-xl overflow-hidden p-5">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono">
          {activeTab === 'shifts' ? 'Dispatched Shift Log' : 'Verified Check-in Attendance Log'}
        </h4>

        {activeTab === 'shifts' ? (
          /* Tab 1: Shifts Table */
          <div className="overflow-x-auto">
            {filteredSchedules.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic text-sm">
                No matching shifts found in the specified range.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 uppercase text-[9.5px] font-mono tracking-wider">
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Technician</th>
                    <th className="py-3.5 px-3">Project Site</th>
                    <th className="py-3.5 px-3">Time Slot</th>
                    <th className="py-3.5 px-3">Hours</th>
                    <th className="py-3.5 px-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-950/20 text-slate-200">
                      <td className="py-3.5 px-3 font-mono">{s.date}</td>
                      <td className="py-3.5 px-3 font-bold">{s.technicianName}</td>
                      <td className="py-3.5 px-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          {s.projectName}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono">{s.time}</td>
                      <td className="py-3.5 px-3 font-mono">{calculateShiftHours(s.time)} hrs</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                          s.status === 'On Time' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          s.status === 'Delayed' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          s.status === 'Absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {s.status === 'On Time' && <CheckCircle2 className="w-3 h-3" />}
                          {s.status === 'Delayed' && <AlertTriangle className="w-3 h-3" />}
                          {s.status === 'Absent' && <XCircle className="w-3 h-3" />}
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Tab 2: Attendance Logs Table */
          <div className="overflow-x-auto">
            {filteredAttendance.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic text-sm">
                No matching attendance log entries found in the specified range.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 uppercase text-[9.5px] font-mono tracking-wider">
                    <th className="py-3.5 px-3">Timestamp</th>
                    <th className="py-3.5 px-3">Technician</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Access Code</th>
                    <th className="py-3.5 px-3">Matched Location Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredAttendance.map((log) => {
                    const punchDate = new Date(log.timestamp);
                    const punchStr = punchDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/20 text-slate-200">
                        <td className="py-3.5 px-3 font-mono">{punchStr}</td>
                        <td className="py-3.5 px-3">
                          <div>
                            <span className="font-bold block">{log.userName || 'Unknown'}</span>
                            <span className="text-[9.5px] text-slate-500 font-mono">{log.userEmail || ''}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                            log.type === 'punch_in' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          }`}>
                            {log.type === 'punch_in' ? 'CHECK-IN' : 'CHECK-OUT'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono">{log.employeeId || 'N/A'}</td>
                        <td className="py-3.5 px-3 max-w-[250px] truncate" title={log.location?.address}>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {log.location?.address || 'Geolocation Recorded'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
