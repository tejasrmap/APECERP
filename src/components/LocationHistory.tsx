import React, { useState, useEffect, useRef } from 'react';
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
import L from 'leaflet';

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
  const [employees, setEmployees] = useState<{
    id: string;
    name: string;
    employeeId: string;
    email: string;
  }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Default to today
  const [startDateStr, setStartDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [endDateStr, setEndDateStr] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Map state and refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline[]>([]);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, 'team'));
        const list = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unknown',
            employeeId: data.employeeId || '',
            email: data.email || ''
          };
        });
        setEmployees(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Error fetching team:", err);
      }
    };
    fetchEmployees();
  }, []);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      // Centered at South/Central India operations area initially
      const map = L.map(mapContainerRef.current, {
        zoomControl: false // custom position
      }).setView([15.3647, 75.1240], 6);

      // Apply CartoDB Positron tile layer (Premium clean light aesthetic)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map);

      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);

      setMapInstance(map);

      // Force size recalculation to prevent grey maps or collapsed tiles
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      return () => {
        map.remove();
        setMapInstance(null);
      };
    } catch (err) {
      console.error('Error initializing map in LocationHistory:', err);
    }
  }, []);

  // 2. Update Map Path & Markers when telemetry data changes
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;

    // Clear existing markers and polylines
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylineRef.current.forEach(p => p.remove());
    polylineRef.current = [];

    // Filter points that have valid coordinates
    const pathPoints = data
      .filter(pt => pt.location?.latitude && pt.location?.longitude)
      .map(pt => [pt.location.latitude, pt.location.longitude] as L.LatLngExpression);

    if (pathPoints.length === 0) return;

    // Draw route lines connecting coordinates chronologically
    if (pathPoints.length >= 2) {
      // Outer glow line (darker blue shadow)
      const glowLine = L.polyline(pathPoints, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.15,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);
      polylineRef.current.push(glowLine);

      // Core route line (cyan dash/dotted line)
      const coreLine = L.polyline(pathPoints, {
        color: '#06b6d4',
        weight: 3.5,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: '1, 5' // dotted path style
      }).addTo(map);
      polylineRef.current.push(coreLine);
    }

    // Add Start and End markers (points are sorted latest first, so last element is start, first is end)
    const endPoint = data[0];
    const startPoint = data[data.length - 1];

    if (startPoint && startPoint.location?.latitude && startPoint.location?.longitude) {
      const startPos: L.LatLngExpression = [startPoint.location.latitude, startPoint.location.longitude];
      
      const startHtml = `
        <div class="relative flex items-center justify-center w-6 h-6 rounded-full border border-emerald-500 text-emerald-500 bg-emerald-950/90 font-bold text-[9px] shadow-md font-mono">
          S
        </div>
      `;
      const startIcon = L.divIcon({
        className: 'custom-route-marker-start',
        html: startHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const startMarker = L.marker(startPos, { icon: startIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-2.5 min-w-[140px] text-slate-200 bg-[#0e1422]/95 border border-slate-800 rounded-xl text-[10px] font-sans shadow-2xl">
            <strong class="text-emerald-400 font-bold">Route Start</strong>
            <p class="mt-0.5 font-mono text-[9px] text-slate-400">${startPoint.timestamp.toLocaleString('en-IN')}</p>
            <p class="text-[9px] text-slate-500 mt-1 leading-tight border-t border-slate-900 pt-1">${startPoint.location.address || 'Background Telemetry'}</p>
          </div>
        `, { closeButton: false, className: 'leaflet-custom-popup', offset: [0, -4] });
      markersRef.current.push(startMarker);
    }

    if (endPoint && endPoint.location?.latitude && endPoint.location?.longitude && data.length >= 2) {
      const endPos: L.LatLngExpression = [endPoint.location.latitude, endPoint.location.longitude];

      const endHtml = `
        <div class="relative flex items-center justify-center w-6 h-6 rounded-full border border-rose-500 text-rose-500 bg-rose-950/90 font-bold text-[9px] shadow-md font-mono animate-pulse">
          E
        </div>
      `;
      const endIcon = L.divIcon({
        className: 'custom-route-marker-end',
        html: endHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const endMarker = L.marker(endPos, { icon: endIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-2.5 min-w-[140px] text-slate-200 bg-[#0e1422]/95 border border-slate-800 rounded-xl text-[10px] font-sans shadow-2xl">
            <strong class="text-rose-400 font-bold">Route End (Latest)</strong>
            <p class="mt-0.5 font-mono text-[9px] text-slate-400">${endPoint.timestamp.toLocaleString('en-IN')}</p>
            <p class="text-[9px] text-slate-500 mt-1 leading-tight border-t border-slate-900 pt-1">${endPoint.location.address || 'Background Telemetry'}</p>
          </div>
        `, { closeButton: false, className: 'leaflet-custom-popup', offset: [0, -4] });
      markersRef.current.push(endMarker);
    }

    // Zoom/fit map to bounds of the route points
    try {
      const bounds = L.latLngBounds(pathPoints);
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch (e) {
      console.warn("Could not fit bounds:", e);
    }
  }, [data, mapInstance]);

  // 3. Interactive row clicking to pan/zoom map to that location
  const handleRowClick = (point: TelemetryPoint) => {
    if (!mapInstance || !point.location?.latitude || !point.location?.longitude) return;

    const pos: L.LatLngExpression = [point.location.latitude, point.location.longitude];
    mapInstance.setView(pos, 16);

    L.popup({ closeButton: false, className: 'leaflet-custom-popup' })
      .setLatLng(pos)
      .setContent(`
        <div class="p-2.5 min-w-[150px] text-slate-200 bg-[#0e1422]/95 border border-slate-800 rounded-xl text-[10px] font-sans shadow-2xl">
          <strong class="text-cyan-400 font-bold">Visited Coordinate</strong>
          <p class="mt-0.5 font-mono text-[9px] text-slate-400">${point.timestamp.toLocaleString('en-IN')}</p>
          <p class="text-[9px] text-slate-500 mt-1 leading-tight border-t border-slate-900 pt-1">${point.location.address || 'Background Telemetry'}</p>
        </div>
      `)
      .openOn(mapInstance);
  };

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

      const empInfo = employees.find(e => e.id === selectedEmployee);
      const customEmpId = empInfo?.employeeId || '';
      const empEmail = empInfo?.email || '';

      const queries = [];

      if (empEmail) {
        queries.push(getDocs(query(
          collection(db, 'telemetry'),
          where('userEmail', '==', empEmail)
        )));
        queries.push(getDocs(query(
          collection(db, 'telemetry'),
          where('userEmail', '==', empEmail.toLowerCase())
        )));
      }

      if (customEmpId) {
        queries.push(getDocs(query(
          collection(db, 'telemetry'),
          where('employeeId', '==', customEmpId)
        )));
      }

      // Fallback queries (e.g. document ID used as employeeId or userId)
      queries.push(getDocs(query(
        collection(db, 'telemetry'),
        where('employeeId', '==', selectedEmployee)
      )));
      queries.push(getDocs(query(
        collection(db, 'telemetry'),
        where('userId', '==', selectedEmployee)
      )));

      const snaps = await Promise.all(queries);
      const seenIds = new Set<string>();
      const uniqueDocs: any[] = [];

      snaps.forEach(snap => {
        snap.docs.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            uniqueDocs.push(doc);
          }
        });
      });

      const points = uniqueDocs
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

      {/* Map and Table Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Map Panel (2/3 width on large screens) */}
        <div className="lg:col-span-2 rounded-2xl glass-card border border-white/10 shadow-xl overflow-hidden p-5 flex flex-col min-h-[500px]">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono flex items-center justify-between">
            <span>Route Map Path</span>
            {data.length > 0 && <span className="text-[10px] text-cyan-400 font-normal normal-case font-sans">Click on any table row to locate point on map</span>}
          </h4>
          <div 
            ref={mapContainerRef} 
            className="flex-1 w-full rounded-xl bg-slate-950/60 border border-slate-900 overflow-hidden min-h-[420px] z-0"
          />
        </div>

        {/* Telemetry Points List (1/3 width on large screens) */}
        <div className="rounded-2xl glass-card border border-white/10 shadow-xl overflow-hidden p-5 flex flex-col h-[500px]">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono">
            Telemetry Points ({data.length})
          </h4>

          <div className="overflow-y-auto pr-1 flex-1 min-h-[350px]">
            {data.length === 0 && !loading ? (
              <div className="p-12 text-center text-slate-500 italic text-sm">
                Use the filters above to fetch location history.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse relative">
                <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                  <tr className="border-b border-slate-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider">
                    <th className="py-2.5 px-2">Time</th>
                    <th className="py-2.5 px-2">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {data.map((point) => (
                    <tr 
                      key={point.id} 
                      onClick={() => handleRowClick(point)}
                      className="hover:bg-slate-900/30 text-slate-200 cursor-pointer active:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-2 vertical-align-top">
                        <div className="flex flex-col gap-0.5 font-mono">
                          <span className="font-bold text-[10px] text-cyan-400 whitespace-nowrap">
                            {point.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-[8px] text-slate-500 whitespace-nowrap">
                            {point.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                            <span className="text-[9.5px] text-slate-400 leading-tight">
                              {point.location?.address || 'Background Telemetry'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[8.5px] text-slate-500 font-mono">
                            <span>Lat: {point.location?.latitude?.toFixed(4) || '-'}</span>
                            <span>Lng: {point.location?.longitude?.toFixed(4) || '-'}</span>
                            {point.location?.accuracy && <span>({Math.round(point.location.accuracy)}m)</span>}
                            {point.isBackground && (
                              <span className="px-1 py-0.5 rounded bg-slate-900 text-[7.5px] text-slate-400 uppercase font-bold border border-slate-800 shrink-0">
                                BG
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
