import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Loader2,
  ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;


const getDefaultCoordinates = (siteName: string) => {
  const name = siteName.toLowerCase();
  if (name.includes('hubli')) {
    return { latitude: 15.3647, longitude: 75.1240 };
  }
  if (name.includes('koppal')) {
    return { latitude: 15.3533, longitude: 76.1554 };
  }
  if (name.includes('dharwad')) {
    return { latitude: 15.4589, longitude: 75.0078 };
  }
  if (name.includes('vijayawada') || name.includes('vja')) {
    return { latitude: 16.5062, longitude: 80.6480 };
  }
  if (name.includes('gudivada') || name.includes('gdv')) {
    return { latitude: 16.4419, longitude: 80.9928 };
  }
  if (name.includes('hyderabad') || name.includes('hyd')) {
    return { latitude: 17.3850, longitude: 78.4867 };
  }
  if (name.includes('karimnagar')) {
    return { latitude: 18.4386, longitude: 79.1288 };
  }
  if (name.includes('visakhapatnam') || name.includes('vizag')) {
    return { latitude: 17.6868, longitude: 83.2185 };
  }
  if (name.includes('tirupati')) {
    return { latitude: 13.6288, longitude: 79.4192 };
  }
  // Default to Vijayawada center coordinates as regional default fallback
  return { latitude: 16.5062, longitude: 80.6480 };
};

export default function Projects() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Gantt / Milestones States
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null);

  const milestonesList = [
    'Site Audit & Clearance',
    'Material Allocation & Dispatch',
    'Electrical Wiring & Integration',
    'Safety Verification & LOTO Check',
    'System Commissioning & Grid Sync'
  ];

  const handleToggleMilestone = async (project: any, milestoneName: string) => {
    const currentList = project.completedMilestones || [];
    const nextList = currentList.includes(milestoneName)
      ? currentList.filter((m: string) => m !== milestoneName)
      : [...currentList, milestoneName];

    // If no db, just update state locally
    if (!db) {
      setProjectsList(prev => prev.map(p => p.id === project.id ? { ...p, completedMilestones: nextList } : p));
      return;
    }

    setIsDbActionLoading(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        completedMilestones: nextList
      });
    } catch (err) {
      console.error('Error updating milestone:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('Active');
  const [newProjectSite, setNewProjectSite] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [newProjectLat, setNewProjectLat] = useState('');
  const [newProjectLng, setNewProjectLng] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProjectsLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Pradeep Moses Mathi', role: 'Managing Director' },
        { id: '2', name: 'Teja Ganugula', role: 'Team Member' },
        { id: '3', name: 'GT InnoX LLP', role: 'Technical Partner' }
      ]);
      setIsProjectsLoading(false);
      return;
    }

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(projs);
      setIsProjectsLoading(false);

      // Auto-calibrate coordinates in Firestore if they are set to old Hubli fallback (15.3647, 75.1240)
      if (isAdmin && db) {
        projs.forEach(async (p) => {
          const name = (p.name || '').toLowerCase();
          const site = (p.site || '').toLowerCase();
          const pLat = parseFloat(p.latitude);
          const pLng = parseFloat(p.longitude);
          const isOldDefault = Math.abs(pLat - 15.3647) < 0.001 && Math.abs(pLng - 75.1240) < 0.001;
          
          if (isOldDefault) {
            let nextLat = pLat;
            let nextLng = pLng;
            let updated = false;

            if (site.includes('vja') || name.includes('apec')) {
              nextLat = 16.5062;
              nextLng = 80.6480;
              updated = true;
            } else if (site.includes('gdv') || name.includes('gtx')) {
              nextLat = 16.4419;
              nextLng = 80.9928;
              updated = true;
            }

            if (updated) {
              try {
                await updateDoc(doc(db, 'projects', p.id), {
                  latitude: nextLat,
                  longitude: nextLng
                });
                console.log(`Calibrated coordinates for project ${p.name} in Firestore`);
              } catch (err) {
                console.error(`Calibration error for ${p.name}:`, err);
              }
            }
          }
        });
      }
    }, (err) => {
      console.error('Projects listener error:', err);
      setFirestoreError(err.code);
      setIsProjectsLoading(false);
    });

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      setTeamList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Team load error in Projects:', err);
    });

    return () => {
      unsubProjects();
      unsubTeam();
    };
  }, [setFirestoreError]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView([16.5062, 80.6480], 7);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers & circles when projectsList changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (projectsList.length === 0) return;

    const bounds: L.LatLngBoundsExpression = [];

    projectsList.forEach(p => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const pos: L.LatLngExpression = [lat, lng];
      bounds.push(pos);

      let color = '#f59e0b'; // Pending: Amber
      if (p.status === 'Active') color = '#10b981'; // Active: Green
      else if (p.status === 'Completed') color = '#06b6d4'; // Completed: Cyan

      // Area Circle (30km radius)
      L.circle(pos, {
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        radius: 30000
      }).addTo(layerGroup).bindPopup(`
        <div style="font-family: sans-serif; color: #f1f5f9; background: #0b1329; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #22d3ee;">${p.name}</h4>
          <div style="font-size: 11px; margin-bottom: 2px;"><strong>Site:</strong> ${p.site}</div>
          <div style="font-size: 11px; margin-bottom: 2px;"><strong>Manager:</strong> ${p.manager}</div>
          <div style="font-size: 11px; margin-bottom: 6px;"><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${p.status}</span></div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;"><strong>Progress:</strong> ${(p.completedMilestones || []).length}/5 Milestones (${Math.round(((p.completedMilestones || []).length / 5) * 100)}%)</div>
          <div style="background: #1e293b; height: 4px; border-radius: 2px; overflow: hidden;">
            <div style="background: ${color}; width: ${Math.round(((p.completedMilestones || []).length / 5) * 100)}%; height: 100%;"></div>
          </div>
        </div>
      `, {
        className: 'leaflet-custom-popup',
        closeButton: false
      });

      // Center CircleMarker
      L.circleMarker(pos, {
        color: color,
        fillColor: color,
        fillOpacity: 0.9,
        radius: 6.5,
        weight: 2
      }).addTo(layerGroup).bindPopup(`
        <div style="font-family: sans-serif; color: #f1f5f9; background: #0b1329; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #22d3ee;">${p.name}</h4>
          <div style="font-size: 11px; margin-bottom: 2px;"><strong>Site:</strong> ${p.site}</div>
          <div style="font-size: 11px; margin-bottom: 2px;"><strong>Manager:</strong> ${p.manager}</div>
          <div style="font-size: 11px; margin-bottom: 6px;"><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${p.status}</span></div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;"><strong>Progress:</strong> ${(p.completedMilestones || []).length}/5 Milestones (${Math.round(((p.completedMilestones || []).length / 5) * 100)}%)</div>
          <div style="background: #1e293b; height: 4px; border-radius: 2px; overflow: hidden;">
            <div style="background: ${color}; width: ${Math.round(((p.completedMilestones || []).length / 5) * 100)}%; height: 100%;"></div>
          </div>
        </div>
      `, {
        className: 'leaflet-custom-popup',
        closeButton: false
      });
    });

    if (bounds.length > 0) {
      // Small timeout to ensure container dimensions are set before panning
      setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [30, 30] });
      }, 100);
    }
  }, [projectsList]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !db || !isAdmin) return;
    setIsDbActionLoading(true);
    try {
      let latVal = parseFloat(newProjectLat);
      let lngVal = parseFloat(newProjectLng);

      const defaults = getDefaultCoordinates(newProjectSite || newProjectName || '');
      if (isNaN(latVal)) latVal = defaults.latitude;
      if (isNaN(lngVal)) lngVal = defaults.longitude;

      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        status: newProjectStatus,
        site: newProjectSite || 'General Site',
        manager: newProjectManager || 'Unassigned',
        latitude: latVal,
        longitude: lngVal
      });
      // Add activity
      await addDoc(collection(db, 'activities'), {
        title: 'New project registered',
        desc: `Project "${newProjectName}" was added under ${newProjectSite || 'General Site'} (Coordinates: ${latVal.toFixed(4)}, ${lngVal.toFixed(4)})`,
        type: 'task',
        timestamp: Timestamp.now()
      });
      setNewProjectName('');
      setNewProjectSite('');
      setNewProjectManager('');
      setNewProjectLat('');
      setNewProjectLng('');
      setIsAddingProject(false);
    } catch (err) {
      console.error('Error adding project:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteDocument = async (colName: string, id: string, docNameForLog?: string) => {
    if (!db || !isAdmin) return;
    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, colName, id));
      // Log activity
      if (docNameForLog) {
        await addDoc(collection(db, 'activities'), {
          title: `${colName.slice(0, -1)} removed`,
          desc: `"${docNameForLog}" was deleted from the ERP database`,
          type: 'settings',
          timestamp: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  if (isProjectsLoading) {
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
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Project Directory</h3>
          <p className="text-xs text-slate-400 mt-1">APEC active and pipeline installations</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddingProject(!isAddingProject)}
            disabled={isDbActionLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50"
          >
            {isAddingProject ? <ArrowLeft className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isAddingProject ? 'Back to List' : 'Add Project'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAddingProject ? (
          <motion.div 
            key="project-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4">Register New APEC Installation</h4>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Grid Substation Hubli"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={(e) => setNewProjectStatus(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <option value="Active" className="bg-slate-900 text-slate-100">Active</option>
                    <option value="Pending" className="bg-slate-900 text-slate-100">Pending</option>
                    <option value="Completed" className="bg-slate-900 text-slate-100">Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Location Site</label>
                  <input 
                    type="text" 
                    value={newProjectSite}
                    onChange={(e) => setNewProjectSite(e.target.value)}
                    placeholder="e.g. Site A"
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Latitude</label>
                  <input 
                    type="text" 
                    value={newProjectLat}
                    onChange={(e) => setNewProjectLat(e.target.value)}
                    placeholder="e.g. 15.3647 (Optional)"
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Longitude</label>
                  <input 
                    type="text" 
                    value={newProjectLng}
                    onChange={(e) => setNewProjectLng(e.target.value)}
                    placeholder="e.g. 75.1240 (Optional)"
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1 tracking-wider">Project Manager</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-sm cursor-pointer flex justify-between items-center text-left transition-all"
                  >
                    <span className={newProjectManager ? 'text-slate-100' : 'text-slate-500'}>
                      {newProjectManager || 'Select Project Manager...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isManagerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsManagerDropdownOpen(false)} />
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
                                setNewProjectManager(t.name);
                                setIsManagerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                newProjectManager === t.name 
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                  : 'text-slate-350 hover:bg-slate-800 border border-transparent'
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
              <button
                type="submit"
                disabled={isDbActionLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Project'}
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* GIS Operations Map */}
            <div className="p-5 lg:p-6 rounded-2xl glass-card relative overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    GIS Grid Operations Map
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Substation coordinates and telemetry positions</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Active Site</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Completed</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending</span>
                </div>
              </div>

              {/* GIS Leaflet Map Container */}
              <div 
                ref={mapContainerRef} 
                className="relative h-64 w-full rounded-xl overflow-hidden border border-slate-900 shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)] z-0"
              />
            </div>

            {/* Project List Table */}
            <motion.div 
              key="project-table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
              {projectsList.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <Activity className="w-14 h-14 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No projects registered</p>
                  <p className="text-xs text-slate-500 mt-1">Get started by clicking Add Project or seeding database.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/45 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="p-4">Project Name</th>
                        <th className="p-4 hidden sm:table-cell">Site Location</th>
                         <th className="p-4 hidden md:table-cell">Project Manager</th>
                        <th className="p-4">Status</th>
                        {isAdmin && <th className="p-4 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                      {projectsList.map((p) => (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-slate-900/30 transition-colors">
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 font-bold text-slate-100 cursor-pointer hover:text-cyan-400 transition-colors"
                            >
                              {p.name}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 hidden sm:table-cell font-medium cursor-pointer"
                            >
                              <div>{p.site}</div>
                              {p.latitude !== undefined && p.longitude !== undefined && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                                </div>
                              )}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 hidden md:table-cell font-medium cursor-pointer"
                            >
                              {p.manager}
                            </td>
                            <td 
                              onClick={() => setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                              className="p-4 cursor-pointer"
                            >
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                                p.status === 'Completed' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25' :
                                'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => handleDeleteDocument('projects', p.id, p.name)}
                                  disabled={isDbActionLoading}
                                  className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors rounded hover:bg-rose-950/20 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>

                          {/* Expanded Gantt milestones panel */}
                          {expandedProjectId === p.id && (
                            <tr className="bg-slate-950/20">
                              <td colSpan={isAdmin ? 5 : 4} className="p-4 border-t border-slate-800/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Project Gantt Milestones</h5>
                                    <div className="space-y-2.5">
                                      {milestonesList.map((mName, mIdx) => {
                                        const isDone = (p.completedMilestones || []).includes(mName);
                                        return (
                                          <label key={mIdx} className="flex items-center gap-3 cursor-pointer group text-xs text-slate-350 select-none">
                                            <input
                                              type="checkbox"
                                              checked={isDone}
                                              onChange={() => handleToggleMilestone(p, mName)}
                                              disabled={isDbActionLoading}
                                              className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className={`transition-all ${isDone ? 'line-through text-slate-500' : 'group-hover:text-slate-100'}`}>
                                              {mName}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Installation Roadmap</h5>
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1 text-slate-400">
                                          <span>Completion Progress</span>
                                          <span className="text-cyan-400">{Math.round(((p.completedMilestones || []).length / milestonesList.length) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                          <div 
                                            className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                            style={{ width: `${((p.completedMilestones || []).length / milestonesList.length) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-[11px] leading-relaxed text-slate-400">
                                        <span className="font-bold text-slate-200 block mb-1">Status Report</span>
                                        {p.status === 'Completed' ? 'Installation is fully commissioned and synced to the local grid network.' :
                                         (p.completedMilestones || []).length === milestonesList.length ? 'All safety permits and wiring are completed. Pending final commissioning approvals.' :
                                         'Project is currently in progress. Ensure safety permits are logged under the Safety tab before wiring.'}
                                      </div>
                                      {p.latitude !== undefined && p.longitude !== undefined && (
                                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-[11px] leading-relaxed text-slate-400 font-mono">
                                          <span className="font-bold text-slate-200 block mb-1 font-sans">Geofencing Telemetry</span>
                                          Latitude: {Number(p.latitude).toFixed(6)}<br />
                                          Longitude: {Number(p.longitude).toFixed(6)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
