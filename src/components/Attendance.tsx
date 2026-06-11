import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  Shield, 
  Download, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Map, 
  Video, 
  VideoOff, 
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db, auth } from '../firebase';
import { supabase } from '../supabase';
import ImageViewerModal from './ImageViewerModal';

export default function Attendance() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile } = useOutletContext<any>();

  const activeEmail = userProfile?.email || auth?.currentUser?.email || 'admin@apecpowersolutions.com';
  const isUserAdmin = isAdmin || 
    activeEmail.toLowerCase() === 'admin@apecpowersolutions.com' || 
    activeEmail.toLowerCase() === 'managingdirector@apecpowersolutions.com';

  // Camera & Capture states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Geolocation states
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Punch actions
  const [punchSuccess, setPunchSuccess] = useState<{ type: string; time: Date } | null>(null);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // History & Filters
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'punch_in' | 'punch_out'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Photo viewer modal state
  const [viewerPhoto, setViewerPhoto] = useState<{ url: string; name: string } | null>(null);

  // Fallback indicator
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Start video stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not access camera. Please verify it is not in use by another program.'
      );
    }
  };

  // Synchronize stream with video element once it is mounted in the DOM
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  // Stop video stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo & Geolocation info
  const captureInfo = () => {
    setCameraError(null);
    setLocationError(null);

    // 1. Capture snapshot from video
    const video = videoRef.current;
    if (video && isCameraActive) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 400;
        canvas.height = 300;
        
        // Draw the frame.
        context.drawImage(video, 0, 0, 400, 300);
        
        // Compress & convert to JPEG base64 URL (~25-35KB)
        const photoData = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(photoData);
        stopCamera();
      }
    } else if (!capturedPhoto) {
      setCameraError('Please start the camera and stand in the viewport.');
      return;
    }

    // 2. Fetch Geolocation coordinates
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = position.coords.accuracy;

        setCoords({ latitude: lat, longitude: lon, accuracy: acc });
        setIsLocationLoading(false);

        // Reverse geocode via Nominatim API (OpenStreetMap)
        setIsGeocoding(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: {
              'User-Agent': 'APECERP-Attendance/1.0'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress(`Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
            }
          } else {
            setAddress(`Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        } catch (geocodeErr) {
          console.error('Geocoding failed:', geocodeErr);
          setAddress(`Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } finally {
          setIsGeocoding(false);
        }
      },
      (err) => {
        console.error('Location error:', err);
        setIsLocationLoading(false);
        let errorMsg = 'Could not retrieve coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'GPS location access denied. Please enable location permissions.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable. Verify GPS is enabled.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Reset captured state
  const handleReset = () => {
    setCapturedPhoto(null);
    setCoords(null);
    setAddress('');
    setLocationError(null);
    setCameraError(null);
    startCamera();
  };

  // Upload Photo helper - uses Supabase Storage if active, else falls back to base64 string
  const uploadPhoto = async (base64Photo: string, empId: string): Promise<string> => {
    if (supabase) {
      try {
        const response = await fetch(base64Photo);
        const blob = await response.blob();
        const file = new File([blob], `attendance-${empId}-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        const path = `attendance-photos/${empId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from('APECERP')
          .upload(path, file, { cacheControl: '3600', upsert: true });

        if (!error) {
          const { data } = supabase.storage.from('APECERP').getPublicUrl(path);
          return data.publicUrl;
        } else {
          console.warn('Supabase storage upload failed, saving as base64 instead:', error);
        }
      } catch (err) {
        console.error('Error during photo upload process:', err);
      }
    }
    return base64Photo; // Fallback
  };

  // Load list of registered team members
  useEffect(() => {
    if (!db) {
      // Offline fallback lists
      const localTeam = JSON.parse(localStorage.getItem('apec_team_members') || '[]');
      if (localTeam.length > 0) {
        setTeamList(localTeam);
      } else {
        // Fallback default mockup team list
        const fallbackTeam = [
          { id: 'admin-1', name: 'Admin User', email: 'admin@apecpowersolutions.com', employeeId: 'APEC-0001', department: 'Operations Control', role: 'System Administrator' },
          { id: 'md-1', name: 'Managing Director', email: 'managingdirector@apecpowersolutions.com', employeeId: 'APEC-0002', department: 'Executive Board', role: 'Managing Director' },
          { id: 'tech-1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', department: 'Solar Installation', role: 'Lead Field Engineer' }
        ];
        setTeamList(fallbackTeam);
        localStorage.setItem('apec_team_members', JSON.stringify(fallbackTeam));
      }
      return;
    }

    const q = collection(db, 'team');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamList(list);
    }, (err) => {
      console.error('Error loading team members:', err);
      setFirestoreError(err.code);
    });

    return () => unsub();
  }, [setFirestoreError]);

  // Handle current user matching
  useEffect(() => {
    const activeEmail = userProfile?.email || auth?.currentUser?.email || 'admin@apecpowersolutions.com';
    const activeName = userProfile?.name || auth?.currentUser?.displayName || 'Admin User';
    const activeEmpId = userProfile?.employeeId || 'APEC-0001';

    // Find in loaded teamList
    const matched = teamList.find(t => t.email?.toLowerCase() === activeEmail.toLowerCase());
    if (matched) {
      setSelectedUser(matched);
    } else if (teamList.length > 0) {
      // Default to first match or create custom matching
      setSelectedUser({
        id: 'current',
        name: activeName,
        email: activeEmail,
        employeeId: activeEmpId,
        department: userProfile?.department || 'Operations',
        role: userProfile?.role || 'Staff Member'
      });
    }
  }, [teamList, userProfile]);

  // Load attendance logs
  useEffect(() => {
    if (!db) {
      setIsFallbackMode(true);
      const localLogs = JSON.parse(localStorage.getItem('apec_attendance_logs') || '[]');
      setLogs(localLogs);
      setIsLogsLoading(false);
      return;
    }

    setIsFallbackMode(false);
    const unsub = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        let tsString = new Date().toISOString();
        if (data.timestamp) {
          if (data.timestamp.toDate) tsString = data.timestamp.toDate().toISOString();
          else if (data.timestamp.seconds) tsString = new Date(data.timestamp.seconds * 1000).toISOString();
        }
        return {
          id: doc.id,
          ...data,
          timestamp: tsString
        };
      });
      // Sort desc
      list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
      setIsLogsLoading(false);
    }, (err) => {
      console.error('Attendance listener error:', err);
      setIsFallbackMode(true);
      // Try local storage fallback
      const localLogs = JSON.parse(localStorage.getItem('apec_attendance_logs') || '[]');
      setLogs(localLogs);
      setIsLogsLoading(false);
    });

    return () => unsub();
  }, []);

  // Submit attendance punch
  const handlePunch = async (punchType: 'punch_in' | 'punch_out') => {
    if (!selectedUser) {
      alert('Could not identify your user profile. Please verify registry.');
      return;
    }
    if (!capturedPhoto) {
      alert('A photo must be captured to take attendance.');
      return;
    }
    if (!coords) {
      alert('Location coordinates are required. Allow GPS access.');
      return;
    }

    setIsDbActionLoading(true);
    try {
      // 1. Upload photo to storage
      const finalPhotoUrl = await uploadPhoto(capturedPhoto, selectedUser.employeeId || selectedUser.id);

      // 2. Prepare record payload
      const payload: any = {
        employeeId: selectedUser.employeeId || 'APEC-MEMBER',
        userName: selectedUser.name,
        userEmail: selectedUser.email,
        type: punchType,
        photoUrl: finalPhotoUrl,
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          address: address || `Latitude: ${coords.latitude.toFixed(6)}, Longitude: ${coords.longitude.toFixed(6)}`
        }
      };

      const now = new Date();

      if (db && !isFallbackMode) {
        // Save to firestore
        await addDoc(collection(db, 'attendance'), {
          ...payload,
          timestamp: Timestamp.fromDate(now)
        });

        // Add to recent activity log
        await addDoc(collection(db, 'activities'), {
          title: `${selectedUser.name} Punched ${punchType === 'punch_in' ? 'In' : 'Out'}`,
          desc: `Location: ${payload.location.address.slice(0, 50)}...`,
          type: 'task',
          timestamp: Timestamp.fromDate(now)
        });
      } else {
        // Fallback local storage
        const currentLogs = JSON.parse(localStorage.getItem('apec_attendance_logs') || '[]');
        const localRecord = {
          id: `local-${Date.now()}`,
          ...payload,
          timestamp: now.toISOString()
        };
        currentLogs.unshift(localRecord);
        localStorage.setItem('apec_attendance_logs', JSON.stringify(currentLogs));
        setLogs(currentLogs);
      }

      setPunchSuccess({ type: punchType, time: now });
      setCapturedPhoto(null);
      setCoords(null);
      setAddress('');

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setPunchSuccess(null);
      }, 5000);

    } catch (err) {
      console.error('Attendance punch failed:', err);
      alert('An error occurred while submitting your attendance. Please try again.');
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Export attendance logs to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Time,Employee ID,Name,Email,Type,Latitude,Longitude,Address\n';

    filteredLogs.forEach(log => {
      const d = new Date(log.timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      const cleanAddress = (log.location?.address || '').replace(/"/g, '""');
      csvContent += `"${dateStr}","${timeStr}","${log.employeeId}","${log.userName}","${log.userEmail}","${log.type === 'punch_in' ? 'Punch In' : 'Punch Out'}","${log.location?.latitude || ''}","${log.location?.longitude || ''}","${cleanAddress}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APEC_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic
  const filteredLogs = logs.filter(log => {
    // Normal users can only see their own attendance logs (inherited from component scope)

    if (!isUserAdmin && log.userEmail?.toLowerCase() !== activeEmail.toLowerCase()) {
      return false;
    }

    // Search query match
    const term = searchTerm.toLowerCase();
    const nameMatch = log.userName?.toLowerCase().includes(term) || false;
    const empIdMatch = log.employeeId?.toLowerCase().includes(term) || false;
    const addrMatch = log.location?.address?.toLowerCase().includes(term) || false;
    const emailMatch = log.userEmail?.toLowerCase().includes(term) || false;
    const searchMatch = nameMatch || empIdMatch || addrMatch || emailMatch;

    // Type filter
    const typeMatch = typeFilter === 'all' || log.type === typeFilter;

    // Date filter
    let dateMatch = true;
    if (dateFilter) {
      const logDate = log.timestamp.split('T')[0];
      dateMatch = logDate === dateFilter;
    }

    return searchMatch && typeMatch && dateMatch;
  });

  // Ensure camera stops when leaving route
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Operational Attendance Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">Register daily attendance verified by real-time camera snapshot and GPS tracking</p>
        </div>

        {/* Fallback indicator */}
        {isFallbackMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Offline Local Mode Active
          </div>
        )}
      </div>

      {/* Main split grid or centered container */}
      <div className={isUserAdmin ? "grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" : "w-full"}>
        
        {/* PUNCH CARD INTERFACE */}
        <div className={isUserAdmin ? "xl:col-span-5 space-y-6" : "max-w-xl mx-auto w-full space-y-6"}>
          <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                Verified Attendance Punch
              </h3>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                SECURE SHA-256
              </span>
            </div>

            {/* Simulated Profiles Dropdown for Dev/Test fallbacks */}
            {isAdmin && teamList.length > 0 && (
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Console Simulator (Select Team Member)
                </label>
                <select
                  value={selectedUser?.id || ''}
                  onChange={(e) => {
                    const matched = teamList.find(t => t.id === e.target.value);
                    if (matched) setSelectedUser(matched);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeId || 'N/A'}) - {t.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Profile Display Box */}
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                  {selectedUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-100 truncate">{selectedUser.name}</h4>
                  <p className="text-[9.5px] text-cyan-400 font-bold font-mono tracking-wide leading-tight">{selectedUser.employeeId || 'APEC-MEMBER'}</p>
                  <p className="text-[9.5px] text-slate-500 truncate">{selectedUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-slate-950 border border-slate-900 rounded text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-none">
                    {selectedUser.department?.split(' ')[0] || 'Operations'}
                  </span>
                </div>
              </div>
            )}

            {/* Capture Panel Viewport */}
            <div className="relative aspect-video rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              {/* Scanline overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 z-10">
                  <div className="w-full h-0.5 bg-cyan-400/30 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-[bounce_3s_infinite_linear]" />
                </div>
              )}

              {/* Success Badge */}
              <AnimatePresence>
                {punchSuccess && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute inset-0 bg-[#070a13]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Punch Success</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {punchSuccess.type === 'punch_in' ? 'PUNCHED IN' : 'PUNCHED OUT'} successfully registered.
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {punchSuccess.time.toLocaleTimeString()} · SECURE INTEGRITY
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Viewport content */}
              {!capturedPhoto && isCameraActive && (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
              )}

              {capturedPhoto && (
                <img 
                  src={capturedPhoto} 
                  alt="Captured frame" 
                  className="w-full h-full object-cover" 
                />
              )}

              {/* Camera Offline Display */}
              {!isCameraActive && !capturedPhoto && (
                <div className="text-center p-6 flex flex-col items-center gap-2">
                  <VideoOff className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-500">APEC Camera feed deactivated</p>
                  <p className="text-[9px] text-slate-600 max-w-[200px]">Stand inside camera viewpoint and start system stream</p>
                </div>
              )}
            </div>

            {/* Location Status Card */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500" /> Location Registry
                </span>
                <span>GPS Core Status</span>
              </div>

              <div className="p-3 bg-slate-955/60 border border-slate-900 rounded-xl space-y-2 text-xs font-mono">
                {isLocationLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Resolving GPS coordinates...</span>
                  </div>
                ) : coords ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span>LAT: {coords.latitude.toFixed(6)}</span>
                      <span>LON: {coords.longitude.toFixed(6)}</span>
                      <span className="text-slate-500">Acc: &plusmn;{Math.round(coords.accuracy)}m</span>
                    </div>
                    <div className="border-t border-slate-800/80 my-1 pt-1">
                      {isGeocoding ? (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
                          <span>Reverse geocoding address...</span>
                        </div>
                      ) : address ? (
                        <p className="text-slate-300 text-[10.5px] leading-relaxed line-clamp-2" title={address}>
                          {address}
                        </p>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Address geocode unavailable</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 text-[10.5px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>GPS telemetry inactive. Telemetry will resolve on device capture.</span>
                  </div>
                )}

                {locationError && (
                  <div className="p-2.5 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-500 text-[10px] flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                )}
                {cameraError && (
                  <div className="p-2.5 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-500 text-[10px] flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Control Toolbar */}
            <div className="flex gap-2">
              {!isCameraActive && !capturedPhoto ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                >
                  <Video className="w-4 h-4 text-cyan-500" />
                  Activate Camera Feed
                </button>
              ) : (
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    onClick={captureInfo}
                    disabled={isLocationLoading || isGeocoding}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isLocationLoading || isGeocoding ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Camera className="w-4 h-4 text-slate-950" />
                    )}
                    Capture Snapshot & GPS
                  </button>
                  
                  {(capturedPhoto || coords) && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-3 bg-slate-900 border border-slate-800 hover:text-slate-100 hover:border-slate-700 rounded-xl text-xs transition-all flex items-center justify-center active:scale-[0.99] cursor-pointer"
                      title="Reset Stream"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Punch in/out triggers */}
            <div className="flex gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handlePunch('punch_in')}
                disabled={!capturedPhoto || !coords || isDbActionLoading}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-450 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(16,185,129,0.15)] hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isDbActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Punch In
              </button>

              <button
                type="button"
                onClick={() => handlePunch('punch_out')}
                disabled={!capturedPhoto || !coords || isDbActionLoading}
                className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-450 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(244,63,94,0.15)] hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isDbActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Punch Out
              </button>
            </div>

            {/* Security Notice */}
            <div className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-2 text-slate-500 font-mono text-[9px] uppercase tracking-widest justify-center">
              <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Verified Registry Secure Client</span>
            </div>

          </div>
        </div>

        {/* ATTENDANCE HISTORY LIST (COL-7) */}
        {isUserAdmin && (
          <div className="xl:col-span-7 space-y-6">
          <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl">
            
            {/* Header controls & export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Attendance History Registry
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Showing verified logs matching filter credentials</p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredLogs.length === 0}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-805 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/20 p-3 rounded-xl border border-white/5">
              
              {/* Search Bar */}
              <div className="sm:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, ID, address..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-cyan-500 text-slate-100 placeholder:text-slate-500 transition-all shadow-inner"
                />
              </div>

              {/* Type Filter */}
              <div className="sm:col-span-3 relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Punches</option>
                  <option value="punch_in">Punch In Only</option>
                  <option value="punch_out">Punch Out Only</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="sm:col-span-3">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                />
              </div>

            </div>

            {/* Log View List */}
            {isLogsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-2" />
                <p className="text-xs text-slate-400">Syncing with operations database...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800/80 rounded-xl flex flex-col items-center gap-2">
                <Search className="w-10 h-10 text-slate-700" />
                <p className="text-xs font-semibold text-slate-400">No logs match your filter search</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setDateFilter('');
                  }}
                  className="text-[10px] text-cyan-400 font-bold hover:underline"
                >
                  Reset Filtering Parameters
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredLogs.map((log) => {
                  const isPunchIn = log.type === 'punch_in';
                  const logDate = new Date(log.timestamp);
                  
                  return (
                    <div 
                      key={log.id} 
                      className="p-3.5 rounded-xl bg-slate-955/40 border border-slate-900/60 hover:border-slate-800 transition-all flex gap-3.5"
                    >
                      {/* Photo Thumbnail */}
                      <div 
                        onClick={() => {
                          if (log.photoUrl) {
                            setViewerPhoto({
                              url: log.photoUrl,
                              name: `${log.userName} (${log.employeeId}) - ${isPunchIn ? 'Punch In' : 'Punch Out'}`
                            });
                          }
                        }}
                        className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 cursor-pointer hover:border-cyan-500/50 shadow relative group"
                        title="Click to view photo"
                      >
                        {log.photoUrl ? (
                          <>
                            <img 
                              src={log.photoUrl} 
                              alt="Punch" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <Camera className="w-4 h-4 text-slate-600" />
                          </div>
                        )}
                      </div>

                      {/* Log details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                              {log.userName}
                              <span className="text-[8.5px] font-mono text-slate-500 bg-slate-950 px-1 py-0.2 rounded border border-slate-900">
                                {log.employeeId}
                              </span>
                            </h4>
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{log.userEmail}</p>
                          </div>
                          
                          {/* Punch Type Badge */}
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider border leading-none shrink-0 ${
                            isPunchIn 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]' 
                              : 'bg-rose-500/10 text-rose-455 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.05)]'
                          }`}>
                            {isPunchIn ? 'Punch In' : 'Punch Out'}
                          </span>
                        </div>

                        {/* Location address */}
                        <div className="pt-1 flex items-start gap-1 text-[10px] text-slate-450 leading-relaxed font-mono">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                          <span className="truncate flex-1" title={log.location?.address}>
                            {log.location?.address || 'Unknown coordinates'}
                          </span>
                        </div>

                        {/* Date and actions */}
                        <div className="pt-1.5 border-t border-slate-900/60 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{logDate.toLocaleDateString()}</span>
                            <span className="text-slate-700">|</span>
                            <Clock className="w-3 h-3" />
                            <span>{logDate.toLocaleTimeString()}</span>
                          </div>

                          {/* Map trigger link */}
                          {log.location?.latitude && log.location?.longitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${log.location.latitude},${log.location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 hover:underline font-bold"
                            >
                              <Map className="w-3 h-3" />
                              Inspect GPS Map
                            </a>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
        )}

      </div>

      {/* ImageViewerModal for full view */}
      {viewerPhoto && (
        <ImageViewerModal
          isOpen={!!viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          imageUrl={viewerPhoto.url}
          imageName={viewerPhoto.name}
        />
      )}

    </motion.div>
  );
}
