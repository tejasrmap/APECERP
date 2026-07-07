import React, { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  MapPin, 
  Clock, 
  Search, 
  User, 
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface TelemetryPoint {
  id: string;
  userId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  batteryLevel?: number;
  provider?: string;
  isBackground?: boolean;
}

export default function LocationHistory() {
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Default to today
  const [startDateStr, setStartDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [endDateStr, setEndDateStr] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, 'team'));
        const list = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown'
        }));
        setEmployees(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error fetching team:", err);
      }
    };
    fetchEmployees();
  }, []);

  const handleSearch = async () => {
    if (!selectedEmployee) {
      setError("Please select an employee first.");
      return;
    }
    if (!startDateStr || !endDateStr) {
      setError("Please select a valid date range.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setData([]);

    try {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);

      // Query by employeeId (matching the Firestore database writes)
      const q = query(
        collection(db, 'telemetry'),
        where('employeeId', '==', selectedEmployee)
      );

      let snap = await getDocs(q);

      // Fallback query in case any older telemetry records used 'userId' instead of 'employeeId'
      if (snap.empty) {
        const fallbackQ = query(
          collection(db, 'telemetry'),
          where('userId', '==', selectedEmployee)
        );
        snap = await getDocs(fallbackQ);
      }

      const points = snap.docs
        .map(doc => {
          const d = doc.data();
          let ts = new Date();
          if (d.timestamp?.toDate) {
            ts = d.timestamp.toDate();
          } else if (typeof d.timestamp === 'string') {
            ts = new Date(d.timestamp);
          } else if (typeof d.timestamp === 'number') {
            ts = new Date(d.timestamp);
          }

          return {
            id: doc.id,
            ...d,
            timestamp: ts,
          } as TelemetryPoint;
        })
        .filter(point => {
          return point.timestamp >= start && point.timestamp <= end;
        });

      // Sort descending (latest first)
      points.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setData(points);
      
      if (points.length === 0) {
        setError("No location data found for this employee in the selected date range.");
      }
    } catch (err: any) {
      console.error("Error fetching location history:", err);
      setError(err.message || "Failed to fetch data. The query may require a Firestore index.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      "Date",
      "Time",
      "Latitude",
      "Longitude",
      "Accuracy (m)",
      "Address",
      "Battery Level (%)",
      "Is Background"
    ];

    const rows = data.map(point => [
      point.timestamp.toLocaleDateString('en-US'),
      point.timestamp.toLocaleTimeString('en-US'),
      point.location?.latitude || '',
      point.location?.longitude || '',
      point.location?.accuracy ? Math.round(point.location.accuracy) : '',
      point.location?.address ? `"${point.location.address.replace(/"/g, '""')}"` : '',
      point.batteryLevel ? Math.round(point.batteryLevel * 100) : '',
      point.isBackground ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const empName = employees.find(e => e.id === selectedEmployee)?.name || 'Employee';
    const safeName = empName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    link.setAttribute('href', url);
    link.setAttribute('download', `location_history_${safeName}_${startDateStr}_to_${endDateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 pb-32">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div>
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Location Tracking</span>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Old Locations History
          </h3>
          <p className="text-xs text-slate-400 mt-1">View and download historical GPS telemetry data</p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:from-slate-800 disabled:to-slate-800 text-slate-955 disabled:text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] disabled:shadow-none hover:shadow-lg disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-2xl glass-card border border-white/10 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Start Date
            </label>
            <input 
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> End Date
            </label>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none font-mono"
            />
          </div>

          <button 
            onClick={handleSearch}
            disabled={loading}
            className="w-full h-[38px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-cyan-500" /> Searching...</span>
            ) : (
              <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Fetch History</span>
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="rounded-2xl glass-card border border-white/10 shadow-xl overflow-hidden p-5">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono">
          Telemetry Points ({data.length})
        </h4>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {data.length === 0 && !loading ? (
            <div className="p-12 text-center text-slate-500 italic text-sm">
              Use the filters above to fetch location history.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse relative">
              <thead className="sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
                <tr className="border-b border-slate-900 text-slate-400 uppercase text-[9.5px] font-mono tracking-wider">
                  <th className="py-3.5 px-3 whitespace-nowrap">Date & Time</th>
                  <th className="py-3.5 px-3">Coordinates</th>
                  <th className="py-3.5 px-3">Address</th>
                  <th className="py-3.5 px-3 text-center">Accuracy</th>
                  <th className="py-3.5 px-3 text-center">Battery</th>
                  <th className="py-3.5 px-3 text-center">Background</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {data.map((point) => (
                  <tr key={point.id} className="hover:bg-slate-900/20 text-slate-200">
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-[11px] text-cyan-400">
                          {point.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {point.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5 font-mono text-[10px] text-slate-400">
                        <span>Lat: {point.location?.latitude?.toFixed(5) || '-'}</span>
                        <span>Lng: {point.location?.longitude?.toFixed(5) || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-1 max-w-[250px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {point.location?.address || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[10px]">
                      {point.location?.accuracy ? `${Math.round(point.location.accuracy)}m` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[10px]">
                      {point.batteryLevel ? (
                        <span className={point.batteryLevel > 0.2 ? 'text-emerald-400' : 'text-rose-400'}>
                          {Math.round(point.batteryLevel * 100)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        point.isBackground 
                          ? 'bg-slate-800 text-slate-400' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {point.isBackground ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
