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
  const [employeeFilter, setEmployeeFilter] = useState<string>('All');

  // Firebase Collections States
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
      unsubAttendance();
    };
  }, []);

  const calculateGap = (checkInTime: string | null | undefined, checkOutTime: string | null | undefined): string => {
    if (!checkInTime || !checkOutTime) return '-';
    const start = new Date(checkInTime);
    const end = new Date(checkOutTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '0 hrs';
    
    const diffHrs = diffMs / (1000 * 60 * 60);
    const hrs = Math.floor(diffHrs);
    const mins = Math.round((diffHrs - hrs) * 60);
    
    if (hrs === 0) return `${mins} mins`;
    return `${hrs} hr ${mins} min`;
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
      if (!matchesSearch) return false;

      if (employeeFilter !== 'All') {
        const emp = teamList.find(t => t.id === employeeFilter);
        if (emp) {
          const isMatch = log.employeeId === emp.employeeId || log.userEmail?.toLowerCase() === emp.email?.toLowerCase();
          if (!isMatch) return false;
        } else {
          return false;
        }
      }
      
      // Attendance logs don't easily map to projectId without complex cross-referencing.
      // If a project is selected, we could return false, or we can just ignore project filter for attendance.
      // We will ignore projectFilter for attendance since attendance is user-centric, not project-centric in raw logs.

      return true;

    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [attendanceLogs, startDateStr, endDateStr, searchTerm]);

  const pairedAttendance = useMemo(() => {
    const groups: { [email: string]: any[] } = {};
    filteredAttendance.forEach(log => {
      const email = log.userEmail || 'unknown';
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(log);
    });

    const allPairs: any[] = [];

    Object.keys(groups).forEach(email => {
      const logs = [...groups[email]].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      let activeIn: any = null;

      logs.forEach(log => {
        if (log.type === 'punch_in') {
          if (activeIn) {
            allPairs.push({
              id: activeIn.id,
              userName: activeIn.userName,
              userEmail: activeIn.userEmail,
              employeeId: activeIn.employeeId,
              checkIn: activeIn,
              checkOut: null
            });
          }
          activeIn = log;
        } else if (log.type === 'punch_out') {
          if (activeIn) {
            allPairs.push({
              id: `${activeIn.id}--${log.id}`,
              userName: activeIn.userName,
              userEmail: activeIn.userEmail,
              employeeId: activeIn.employeeId,
              checkIn: activeIn,
              checkOut: log
            });
            activeIn = null;
          } else {
            allPairs.push({
              id: log.id,
              userName: log.userName,
              userEmail: log.userEmail,
              employeeId: log.employeeId,
              checkIn: null,
              checkOut: log
            });
          }
        }
      });

      if (activeIn) {
        allPairs.push({
          id: activeIn.id,
          userName: activeIn.userName,
          userEmail: activeIn.userEmail,
          employeeId: activeIn.employeeId,
          checkIn: activeIn,
          checkOut: null
        });
      }
    });

    return allPairs.sort((a, b) => {
      const timeA = a.checkIn?.timestamp || a.checkOut?.timestamp || '';
      const timeB = b.checkIn?.timestamp || b.checkOut?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [filteredAttendance]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";

    csvContent = "data:text/csv;charset=utf-8," 
      + "Technician,Email,Access Code,Check-In Time,Check-In Location,Check-Out Time,Check-Out Location,Duration\n"
      + pairedAttendance.map(p => {
          const inTime = p.checkIn ? new Date(p.checkIn.timestamp).toLocaleString() : '-';
          const inLoc = p.checkIn?.location?.address ? `"${p.checkIn.location.address.replace(/"/g, '""')}"` : '-';
          const outTime = p.checkOut ? new Date(p.checkOut.timestamp).toLocaleString() : (p.checkIn ? 'Still Checked In' : '-');
          const outLoc = p.checkOut?.location?.address ? `"${p.checkOut.location.address.replace(/"/g, '""')}"` : '-';
          const gap = calculateGap(p.checkIn?.timestamp, p.checkOut?.timestamp);
          return `"${p.userName || ''}","${p.userEmail || ''}","${p.employeeId || 'N/A'}","${inTime}",${inLoc},"${outTime}",${outLoc},"${gap}"`;
        }).join("\n");
    fileName = `APEC_Attendance_Report_${startDateStr}_to_${endDateStr}.csv`;

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
          <h2 className="text-base font-bold text-slate-900">Attendance Log</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-900/60">
          
          {/* Employee Dropdown */}
          <div className="flex flex-col gap-1">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">All Employees</option>
              {teamList.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Text Search input */}
          <div className="relative col-span-1 md:col-span-1 lg:col-span-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main Tab Content Tables */}
      <div className="rounded-2xl glass-card border border-white/10 shadow-xl overflow-hidden p-5">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono">
          Verified Check-in Attendance Log
        </h4>

        <div className="overflow-x-auto">
            {pairedAttendance.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic text-sm">
                No matching attendance log entries found in the specified range.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 uppercase text-[9.5px] font-mono tracking-wider">
                    <th className="py-3.5 px-3">Technician</th>
                    <th className="py-3.5 px-3">Check-In</th>
                    <th className="py-3.5 px-3">Check-Out</th>
                    <th className="py-3.5 px-3 text-center">Time Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {pairedAttendance.map((pair) => {
                    const inDate = pair.checkIn ? new Date(pair.checkIn.timestamp) : null;
                    const inStr = inDate ? inDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                    
                    const outDate = pair.checkOut ? new Date(pair.checkOut.timestamp) : null;
                    const outStr = outDate 
                      ? outDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) 
                      : (pair.checkIn ? 'Still Checked In' : '-');
                    
                    const gapStr = calculateGap(pair.checkIn?.timestamp, pair.checkOut?.timestamp);

                    return (
                      <tr key={pair.id} className="hover:bg-slate-900/20 text-slate-200">
                        {/* Technician details */}
                        <td className="py-3.5 px-3">
                          <div>
                            <span className="font-bold block">{pair.userName || 'Unknown'}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[9.5px] text-slate-550 font-mono">{pair.userEmail || ''}</span>
                              {pair.employeeId && (
                                <span className="text-[8px] px-1.5 py-0.25 rounded bg-slate-800 text-slate-400 font-mono">
                                  {pair.employeeId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Check-In Details */}
                        <td className="py-3.5 px-3">
                          {pair.checkIn ? (
                            <div>
                              <span className="font-mono text-cyan-400 text-[11px] block">{inStr}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 max-w-[280px] truncate" title={pair.checkIn.location?.address}>
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                {pair.checkIn.location?.address || 'Geolocation Recorded'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* Check-Out Details */}
                        <td className="py-3.5 px-3">
                          {pair.checkOut ? (
                            <div>
                              <span className="font-mono text-indigo-400 text-[11px] block">{outStr}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 max-w-[280px] truncate" title={pair.checkOut.location?.address}>
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                {pair.checkOut.location?.address || 'Geolocation Recorded'}
                              </span>
                            </div>
                          ) : pair.checkIn ? (
                            <div>
                              <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider block bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                                Active Sync
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-1">Punch Out Pending</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* Time Gap */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`font-mono font-bold text-[13px] ${
                            gapStr !== '-' ? 'text-slate-100' : 'text-slate-600'
                          }`}>
                            {gapStr}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
      </div>

    </div>
  );
}
