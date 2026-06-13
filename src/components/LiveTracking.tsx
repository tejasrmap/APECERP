import React, { useState, useEffect, useRef } from 'react';
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
  department: string;
  role: string;
  lastPunchTime: Date;
  latitude: number;
  longitude: number;
  address: string;
  accuracy?: number;
  assignedProjectName?: string | null;
  isVerifiedOnSite?: boolean;
}

export default function LiveTracking() {
  const { isAdmin } = useOutletContext<any>();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEmployees, setActiveEmployees] = useState<ActiveEmployee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  
  // Real-time listener states
  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

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

  // 2. Fetch today's punches in real-time
  useEffect(() => {
    if (!db) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'attendance'), 
      where('timestamp', '>=', Timestamp.fromDate(todayStart))
    );

    const unsubPunches = onSnapshot(q, (snap) => {
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
      setTodayPunches(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to read punches:", err);
      setLoading(false);
    });

    return () => unsubPunches();
  }, []);

  // 3. Process active states
  useEffect(() => {
    // Map employee email to their chronological punches today
    const employeePunches: { [key: string]: any[] } = {};
    todayPunches.forEach(punch => {
      const email = punch.userEmail?.toLowerCase();
      if (!email) return;
      if (!employeePunches[email]) employeePunches[email] = [];
      employeePunches[email].push(punch);
    });

    const activeList: ActiveEmployee[] = [];
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    Object.keys(employeePunches).forEach(email => {
      const punches = employeePunches[email];
      if (punches.length === 0) return;

      const latestPunch = punches[punches.length - 1];
      
      // If they are currently punched in (latest action today is punch_in)
      if (latestPunch.type === 'punch_in') {
        const teamMember = teamList.find(t => t.email?.toLowerCase() === email);
        
        // Find if they have a schedule shift today
        const shift = schedulesList.find(s => 
          s.date === todayStr && 
          (s.technicianEmail?.toLowerCase() === email || s.technicianId === teamMember?.id)
        );
        const project = shift ? projectsList.find(p => p.id === shift.projectId) : null;

        activeList.push({
          id: teamMember?.id || latestPunch.employeeId || email,
          name: teamMember?.name || latestPunch.userName || 'Unknown Staff',
          email: email,
          employeeId: teamMember?.employeeId || latestPunch.employeeId || 'N/A',
          photoUrl: latestPunch.photoUrl || teamMember?.photoUrl || null,
          department: teamMember?.department || 'Field Service',
          role: teamMember?.role || 'Technician',
          lastPunchTime: latestPunch.timestamp,
          latitude: latestPunch.location?.latitude || 15.3647,
          longitude: latestPunch.location?.longitude || 75.1240,
          address: latestPunch.location?.address || 'Verified Coordinates',
          accuracy: latestPunch.location?.accuracy,
          assignedProjectName: project?.name || latestPunch.geofenceStatus?.assignedProjectName || null,
          isVerifiedOnSite: latestPunch.geofenceStatus?.isVerifiedOnSite || false
        });
      }
    });

    setActiveEmployees(activeList);
  }, [todayPunches, teamList, projectsList, schedulesList]);

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

    // Apply CartoDB Dark Matter tile layer (Premium dark aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

  // 5. Update Map Markers when activeEmployees list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id].remove();
    });
    markersRef.current = {};

    if (activeEmployees.length === 0) return;

    const bounds: L.LatLngBoundsExpression = [];

    activeEmployees.forEach(emp => {
      const pos: L.LatLngExpression = [emp.latitude, emp.longitude];
      bounds.push(pos);

      // Create Custom Popup HTML Content (Sleek Dark Theme)
      const popupContent = `
        <div class="p-2 min-w-[200px] text-slate-200 bg-[#0e1422] rounded-lg border border-slate-800 font-sans">
          <div class="flex items-center gap-2 mb-2">
            ${emp.photoUrl 
              ? `<img src="${emp.photoUrl}" class="w-8 h-8 rounded-full object-cover border border-cyan-500/30" />`
              : `<div class="w-8 h-8 rounded-full bg-cyan-950/40 flex items-center justify-center text-[10px] font-bold text-cyan-400 border border-cyan-500/20">${emp.name.slice(0, 2).toUpperCase()}</div>`
            }
            <div>
              <h4 class="text-xs font-bold text-white leading-none">${emp.name}</h4>
              <span class="text-[9px] text-cyan-400 font-mono font-bold">${emp.employeeId}</span>
            </div>
          </div>
          <div class="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
            <p><strong class="text-slate-300">Project:</strong> ${emp.assignedProjectName || 'Unassigned'}</p>
            <p><strong class="text-slate-300">Status:</strong> ${emp.isVerifiedOnSite ? '<span class="text-emerald-400">On-Site</span>' : '<span class="text-rose-455">Off-Site</span>'}</p>
            <p><strong class="text-slate-300">Last Punch:</strong> ${emp.lastPunchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p class="text-[9px] text-slate-500 mt-1 leading-normal italic">${emp.address.slice(0, 80)}...</p>
          </div>
        </div>
      `;

      // Set custom element colors for status
      const markerOptions = emp.isVerifiedOnSite 
        ? { title: emp.name } 
        : { title: emp.name };

      const marker = L.marker(pos, markerOptions)
        .addTo(map)
        .bindPopup(popupContent, {
          closeButton: false,
          className: 'leaflet-custom-popup'
        });

      // Click event
      marker.on('click', () => {
        setSelectedEmpId(emp.id);
        map.setView(pos, 13);
      });

      markersRef.current[emp.id] = marker;
    });

    // Fit bounds only on initial render/load to prevent disruptive panning while user interacts
    if (bounds.length > 0 && map.getZoom() <= 7) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [activeEmployees]);

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

  const filteredEmployees = activeEmployees.filter(emp => {
    const term = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.employeeId.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term) ||
      emp.address.toLowerCase().includes(term) ||
      (emp.assignedProjectName || '').toLowerCase().includes(term)
    );
  });

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
              {activeEmployees.length} Online
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              placeholder="Search technician, ID..."
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-cyan-500 text-slate-100 placeholder:text-slate-500 transition-all shadow-inner"
            />
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
                          : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
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
                      {emp.address}
                    </p>

                    <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-mono pt-1.5 border-t border-slate-900/60 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        Punched: {emp.lastPunchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {emp.accuracy && (
                        <span>Acc: &plusmn;{Math.round(emp.accuracy)}m</span>
                      )}
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
            <span className="text-[11px] font-extrabold text-slate-100 mt-1 block">CartoDB Dark Tile Engine Active</span>
          </div>
        </div>
      </div>
      
    </div>
  );
}
