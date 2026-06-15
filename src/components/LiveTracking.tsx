import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Shield, 
  Loader2, 
  AlertCircle, 
  User, 
  Search, 
  Map, 
  Navigation, 
  Maximize2 
} from 'lucide-react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon bug in Vite/Webpack build setups
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface ActiveEmployee {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  photoUrl: string | null;
  branch: string;
  role: string;
  lastPunchTime: Date;
  lastTrackedTime: Date;
  latitude: number;
  longitude: number;
  address: string;
  accuracy?: number;
  assignedProjectName?: string | null;
  isVerifiedOnSite?: boolean;
  routePoints?: { latitude: number; longitude: number; timestamp: Date }[];
}

export default function LiveTracking() {
  const { isAdmin } = useOutletContext<any>();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEmployees, setActiveEmployees] = useState<ActiveEmployee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_site' | 'off_site'>('all');
  
  // Real-time listener states
  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [todayTelemetry, setTodayTelemetry] = useState<any[]>([]);
  const [geocodedAddresses, setGeocodedAddresses] = useState<{ [key: string]: string }>({});
  
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<{ [key: string]: L.Polyline }>({});

  // 1. Fetch metadata (team, projects, schedules)
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snap) => {
      setTeamList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjectsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
      setSchedulesList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTeam();
      unsubProjects();
      unsubSchedules();
    };
  }, []);

  // 2. Fetch today's telemetry in real-time
  useEffect(() => {
    if (!db) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'telemetry'), 
      where('timestamp', '>=', Timestamp.fromDate(todayStart))
    );

    const unsubTelemetry = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let ts = new Date();
        if (data.timestamp) {
          if (data.timestamp.toDate) ts = data.timestamp.toDate();
          else if (data.timestamp.seconds) ts = new Date(data.timestamp.seconds * 1000);
        }
        return {
          id: doc.id,
          ...data,
          timestamp: ts
        };
      });
      // Sort ascending to process chronology
      list.sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());
      setTodayTelemetry(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to read telemetry:", err);
      setLoading(false);
    });

    return () => unsubTelemetry();
  }, []);

  // 3. Process active states
  useEffect(() => {
    // Map employee email to their chronological telemetry today
    const employeeTelemetry: { [key: string]: any[] } = {};
    todayTelemetry.forEach(item => {
      const email = item.userEmail?.toLowerCase();
      if (!email) return;
      if (!employeeTelemetry[email]) employeeTelemetry[email] = [];
      employeeTelemetry[email].push(item);
    });

    const activeList: ActiveEmployee[] = [];
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    Object.keys(employeeTelemetry).forEach(email => {
      const items = employeeTelemetry[email];
      if (items.length === 0) return;

      // Filter manual punches from telemetry to determine current clock status
      const manualPunches = items.filter(i => i.type === 'punch_in' || i.type === 'punch_out');
      if (manualPunches.length === 0) return;

      const latestPunch = manualPunches[manualPunches.length - 1];
      
      // If they are currently punched in (latest action today is punch_in)
      if (latestPunch.type === 'punch_in') {
        const teamMember = teamList.find(t => t.email?.toLowerCase() === email);
        
        // Find if they have a schedule shift today
        const shift = schedulesList.find(s => 
          s.date === todayStr && 
          (s.technicianEmail?.toLowerCase() === email || s.technicianId === teamMember?.id)
        );
        const project = shift ? projectsList.find(p => p.id === shift.projectId) : null;

        // Get the latest coordinates (newest item in telemetry today)
        const latestItem = items[items.length - 1];

        // Store all coordinates of today chronologically for route line plotting
        const routePoints = items
          .filter(i => i.location?.latitude && i.location?.longitude)
          .map(i => ({
            latitude: i.location.latitude,
            longitude: i.location.longitude,
            timestamp: i.timestamp
          }));

        activeList.push({
          id: teamMember?.id || latestPunch.employeeId || email,
          name: teamMember?.name || latestPunch.userName || 'Unknown Staff',
          email: email,
          employeeId: teamMember?.employeeId || latestPunch.employeeId || 'N/A',
          photoUrl: latestPunch.photoUrl || teamMember?.photoUrl || null,
          branch: teamMember?.branch || teamMember?.department || 'Vijayawada',
          role: teamMember?.role || 'Technician',
          lastPunchTime: latestPunch.timestamp,
          lastTrackedTime: latestItem.timestamp,
          latitude: latestItem.location?.latitude || 15.3647,
          longitude: latestItem.location?.longitude || 75.1240,
          address: latestItem.location?.address || 'Background Telemetry',
          accuracy: latestItem.location?.accuracy,
          assignedProjectName: project?.name || latestPunch.geofenceStatus?.assignedProjectName || null,
          isVerifiedOnSite: latestPunch.geofenceStatus?.isVerifiedOnSite || false,
          routePoints: routePoints
        });
      }
    });

    setActiveEmployees(activeList);
  }, [todayTelemetry, teamList, projectsList, schedulesList]);

  // Client-side reverse geocoding for background telemetry updates to show real location details on dashboard
  useEffect(() => {
    const fetchGeocode = async (emp: ActiveEmployee) => {
      const lat = emp.latitude;
      const lon = emp.longitude;
      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;

      if (
        (emp.address === 'Background Telemetry' || !emp.address || emp.address.startsWith('Background')) &&
        !geocodedAddresses[key]
      ) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: {
              'User-Agent': 'APECERP-LiveTracking/1.0'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setGeocodedAddresses(prev => ({ ...prev, [key]: data.display_name }));
            }
          }
        } catch (err) {
          console.error("Client-side reverse geocoding failed:", err);
        }
      }
    };

    // Sequential trigger to respect Nominatim request rate limits (1 req/sec)
    let delay = 0;
    activeEmployees.forEach((emp) => {
      const key = `${emp.latitude.toFixed(6)},${emp.longitude.toFixed(6)}`;
      if (
        (emp.address === 'Background Telemetry' || !emp.address || emp.address.startsWith('Background')) &&
        !geocodedAddresses[key]
      ) {
        setTimeout(() => fetchGeocode(emp), delay);
        delay += 1100; // 1.1s delay between fetches
      }
    });
  }, [activeEmployees, geocodedAddresses]);

  // Memoized filtered employees list
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        emp.name.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term) ||
        (emp.branch || '').toLowerCase().includes(term) ||
        emp.address.toLowerCase().includes(term) ||
        (emp.assignedProjectName || '').toLowerCase().includes(term)
      );

      if (!matchesSearch) return false;
      if (statusFilter === 'on_site') return emp.isVerifiedOnSite;
      if (statusFilter === 'off_site') return !emp.isVerifiedOnSite;
      return true;
    });
  }, [activeEmployees, searchTerm, statusFilter]);

  // 4. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous instance if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centered at South/Central India operations area
    const map = L.map(mapContainerRef.current, {
      zoomControl: false // custom zoom control position
    }).setView([15.3647, 75.1240], 6);

    // Apply CartoDB Positron tile layer (Premium clean light aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 5. Update Map Markers when filteredEmployees list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id].remove();
    });
    markersRef.current = {};

    // Clear existing polylines
    Object.keys(polylinesRef.current).forEach(id => {
      polylinesRef.current[id].remove();
    });
    polylinesRef.current = {};

    if (filteredEmployees.length === 0) return;

    const bounds: L.LatLngBoundsExpression = [];

    filteredEmployees.forEach(emp => {
      const pos: L.LatLngExpression = [emp.latitude, emp.longitude];
      bounds.push(pos);

      // Draw Route Lines connecting today's coordinates chronologically
      if (emp.routePoints && emp.routePoints.length >= 2) {
        const latlngs = emp.routePoints.map(pt => [pt.latitude, pt.longitude] as L.LatLngExpression);
        const polyline = L.polyline(latlngs, {
          color: '#06b6d4',
          weight: 3.5,
          opacity: 0.75,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: '1, 5' // gives it a premium tracking path feel
        }).addTo(map);

        polylinesRef.current[emp.id] = polyline;
      }

      // Compute displayAddress
      const key = `${emp.latitude.toFixed(6)},${emp.longitude.toFixed(6)}`;
      const displayAddress = geocodedAddresses[key] || 
        (emp.address === 'Background Telemetry' 
          ? `Background Telemetry (${emp.latitude.toFixed(4)}, ${emp.longitude.toFixed(4)})` 
          : emp.address);

      // Create Custom Popup HTML Content (Sleek Dark Theme)
      const popupContent = `
        <div class="p-3.5 min-w-[220px] text-slate-200 bg-[#0e1422]/95 backdrop-blur border border-slate-800 rounded-xl font-sans shadow-2xl">
          <div class="flex items-center gap-2 mb-2">
            ${emp.photoUrl 
              ? `<img src="${emp.photoUrl}" class="w-9 h-9 rounded-full object-cover border border-cyan-500/30" />`
              : `<div class="w-9 h-9 rounded-full bg-cyan-950/45 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-500/20">${emp.name.slice(0, 2).toUpperCase()}</div>`
            }
            <div>
              <h4 class="text-xs font-bold text-white leading-none">${emp.name}</h4>
              <span class="text-[9px] text-cyan-400 font-mono font-bold">${emp.employeeId}</span>
            </div>
          </div>
          <div class="space-y-1 text-[10px] text-slate-450 border-t border-slate-800/80 pt-1.5 font-sans">
            <p><strong class="text-slate-300 font-semibold">Project:</strong> ${emp.assignedProjectName || 'Unassigned'}</p>
            <p><strong class="text-slate-300 font-semibold">Status:</strong> ${emp.isVerifiedOnSite ? '<span class="text-emerald-400 font-bold">On-Site</span>' : '<span class="text-rose-400 font-bold">Off-Site</span>'}</p>
            <p><strong class="text-slate-300 font-semibold">Last Punch:</strong> ${emp.lastPunchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong class="text-slate-300 font-semibold font-mono text-cyan-400">Last Tracked:</strong> ${emp.lastTrackedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p class="text-[9px] text-slate-500 mt-1.5 leading-normal italic border-t border-slate-800/60 pt-1">${displayAddress.slice(0, 80)}...</p>
          </div>
        </div>
      `;

      // Custom Circular Avatar Marker
      const avatarHtml = `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-lg transition-all duration-200 transform hover:scale-110 ${
          emp.isVerifiedOnSite 
            ? 'border-emerald-500 bg-emerald-950/90 text-emerald-400' 
            : 'border-rose-500 bg-rose-950/90 text-rose-400'
        }">
          ${emp.photoUrl 
            ? `<img src="${emp.photoUrl}" class="w-full h-full rounded-full object-cover" />`
            : `<span class="text-xs font-black uppercase tracking-wider">${emp.name.slice(0, 2).toUpperCase()}</span>`
          }
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-slate-900 ${
            emp.isVerifiedOnSite ? 'bg-emerald-500' : 'bg-rose-500'
          }"></span>
        </div>
      `;

      const avatarIcon = L.divIcon({
        className: 'custom-avatar-marker',
        html: avatarHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const marker = L.marker(pos, {
        icon: avatarIcon,
        title: emp.name
      })
        .addTo(map)
        .bindPopup(popupContent, {
          closeButton: false,
          className: 'leaflet-custom-popup',
          offset: [0, -10]
        });

      // Click event
      marker.on('click', () => {
        setSelectedEmpId(emp.id);
        map.setView(pos, 13);
      });

      markersRef.current[emp.id] = marker;
    });

    // Fit bounds only on initial render/load or filter change to prevent disruptive panning while user interacts
    if (bounds.length > 0 && map.getZoom() <= 7) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredEmployees]);

  // Center map on selected employee
  const handleSelectEmployee = (emp: ActiveEmployee) => {
    setSelectedEmpId(emp.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([emp.latitude, emp.longitude], 14);
      const marker = markersRef.current[emp.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Fit map to show all filtered employees
  const handleFitAllBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredEmployees.length === 0) return;
    const bounds: L.LatLngBoundsExpression = filteredEmployees.map(emp => [emp.latitude, emp.longitude]);
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col lg:flex-row gap-6 relative z-10 select-none">
      
      {/* LEFT PANEL: Live Employee List */}
      <div className="w-full lg:w-96 flex flex-col glass-card border border-white/10 rounded-2xl shadow-xl overflow-hidden shrink-0">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 bg-[#090d16]/30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
              Active Transmissions
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[9px] font-bold text-cyan-400 font-mono">
              {filteredEmployees.length} Online
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              placeholder="Search technician, ID..."
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-cyan-500 text-slate-100 placeholder:text-slate-500 transition-all shadow-inner"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                  : 'bg-slate-950/20 text-slate-400 border-slate-900 hover:text-slate-300 hover:border-slate-800'
              }`}
            >
              All ({activeEmployees.length})
            </button>
            <button
              onClick={() => setStatusFilter('on_site')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                statusFilter === 'on_site'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                  : 'bg-slate-950/20 text-slate-400 border-slate-900 hover:text-slate-300 hover:border-slate-800'
              }`}
            >
              On-Site ({activeEmployees.filter(e => e.isVerifiedOnSite).length})
            </button>
            <button
              onClick={() => setStatusFilter('off_site')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                statusFilter === 'off_site'
                  ? 'bg-rose-500/10 text-rose-455 border-rose-500/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                  : 'bg-slate-950/20 text-slate-400 border-slate-900 hover:text-slate-300 hover:border-slate-800'
              }`}
            >
              Off-Site ({activeEmployees.filter(e => !e.isVerifiedOnSite).length})
            </button>
          </div>
        </div>

        {/* Online Technicians List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mb-2" />
              <p className="text-[10px] text-slate-500">Querying live telemetry...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center gap-2 p-4">
              <MapPin className="w-8 h-8 text-slate-700" />
              <p className="text-xs font-semibold text-slate-400">No active tracking connections</p>
              <p className="text-[9.5px] text-slate-500">No employees are currently punched in for their active shifts today.</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedEmpId === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                      : 'bg-slate-955/30 border-slate-900 hover:border-slate-800'
                  }`}
                >
                  {/* Photo / Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{emp.name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#090d16] bg-emerald-500" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate leading-none">{emp.name}</h4>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none shrink-0 border ${
                        emp.isVerifiedOnSite
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {emp.isVerifiedOnSite ? 'On-Site' : 'Off-Site'}
                      </span>
                    </div>
                    
                    <p className="text-[9.5px] font-bold text-cyan-400 font-mono tracking-wide leading-none">{emp.employeeId}</p>
                    
                    {emp.assignedProjectName && (
                      <p className="text-[9.5px] text-slate-450 font-medium truncate pt-1">
                        Site: <span className="text-slate-300 font-semibold">{emp.assignedProjectName}</span>
                      </p>
                    )}

                    <p className="text-[9.5px] text-slate-500 leading-normal truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                      {(() => {
                        const key = `${emp.latitude.toFixed(6)},${emp.longitude.toFixed(6)}`;
                        if (geocodedAddresses[key]) {
                          return geocodedAddresses[key];
                        }
                        if (emp.address === 'Background Telemetry') {
                          return `Background Telemetry (${emp.latitude.toFixed(4)}, ${emp.longitude.toFixed(4)})`;
                        }
                        return emp.address;
                      })()}
                    </p>

                    <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-900/60 mt-1">
                      <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600 font-bold shrink-0" />
                          Punched: {emp.lastPunchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {emp.accuracy && (
                          <span>Acc: &plusmn;{Math.round(emp.accuracy)}m</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[8.2px] text-cyan-400 font-mono">
                        <Navigation className="w-3 h-3 text-cyan-500/70 animate-pulse shrink-0" />
                        <span>Last Tracked: {emp.lastTrackedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-900 flex items-center justify-center gap-2 text-slate-500 font-mono text-[9px] uppercase tracking-widest text-center select-none shrink-0">
          <Shield className="w-3.5 h-3.5 text-slate-550 shrink-0" />
          <span>Real-time Secure GPS Node Telemetry</span>
        </div>

      </div>

      {/* RIGHT PANEL: Live Interactive Map */}
      <div className="flex-1 h-full glass-card border border-white/10 rounded-2xl overflow-hidden shadow-xl relative flex flex-col">
        {/* Map Wrapper */}
        <div ref={mapContainerRef} className="flex-1 w-full relative z-0" />
        
        {/* Map aesthetic overlay (dark glass header) */}
        <div className="absolute top-4 left-4 z-10 p-3 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl shadow-lg pointer-events-none flex items-center gap-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <div className="font-sans">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Map Diagnostics</span>
            <span className="text-[11px] font-extrabold text-slate-100 mt-1 block">CartoDB Light Tile Engine Active</span>
          </div>
        </div>

        {/* Top-Right Quick Map Actions */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleFitAllBounds}
            className="p-2 px-3 bg-slate-950/85 backdrop-blur hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-[11px] font-bold text-slate-200 cursor-pointer"
            title="Fit map to show all filtered employees"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fit All</span>
          </button>
        </div>
      </div>
      
    </div>
  );
}
