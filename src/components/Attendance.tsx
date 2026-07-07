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
  Calendar,
  ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import app, { db, auth } from '../firebase';
import { supabase } from '../supabase';
import ImageViewerModal from './ImageViewerModal';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

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
  if (name.includes('vijayawada') || name.includes('vja') || name.includes('vga')) {
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

const getLocalDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Attendance() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile } = useOutletContext<any>();

  const activeEmail = userProfile?.email || auth?.currentUser?.email || 'admin@apecpowersolutions.com';
  const isUserAdmin = isAdmin ||
    activeEmail.toLowerCase() === 'admin@apecpowersolutions.com' ||
    activeEmail.toLowerCase() === 'managingdirector@apecpowersolutions.com';

  // Camera & Capture states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bgWatcherIdRef = useRef<string | null>(null);
  const bgTimerRef = useRef<any>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Geolocation states
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Punch actions
  const [punchSuccess, setPunchSuccess] = useState<{ type: string; time: Date; duration?: string } | null>(null);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSimulatedTechDropdownOpen, setIsSimulatedTechDropdownOpen] = useState(false);

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

  // Geofencing related states and memo hooks
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [leavesList, setLeavesList] = useState<any[]>([]);

  const workSessionData = React.useMemo(() => {
    const defaultData = {
      isWorking: false,
      durationStr: '00:00:00',
      progressPercent: 0
    };
    
    if (!selectedUser || !logs) return defaultData;
    const todayStr = new Date().toDateString();
    
    const todayLogs = logs.filter(l => 
      l.employeeId === (selectedUser.employeeId || 'APEC-MEMBER') && 
      new Date(l.timestamp).toDateString() === todayStr
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (todayLogs.length === 0) return defaultData;

    const latestLog = todayLogs[0];
    const isWorking = latestLog.type === 'punch_in';
    
    let totalMs = 0;
    let currentSessionStartMs: number | null = null;
    
    const ascLogs = [...todayLogs].reverse();
    for (let i = 0; i < ascLogs.length; i++) {
      if (ascLogs[i].type === 'punch_in') {
        currentSessionStartMs = new Date(ascLogs[i].timestamp).getTime();
      } else if (ascLogs[i].type === 'punch_out' && currentSessionStartMs) {
        totalMs += (new Date(ascLogs[i].timestamp).getTime() - currentSessionStartMs);
        currentSessionStartMs = null;
      }
    }
    
    if (isWorking && currentSessionStartMs) {
      totalMs += (currentTime.getTime() - currentSessionStartMs);
    }
    
    const hrs = Math.floor(totalMs / 3600000).toString().padStart(2, '0');
    const mins = Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0');
    const secs = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0');
    
    const progressPercent = Math.min(Math.round((totalMs / 32400000) * 100), 100);

    return {
      isWorking,
      durationStr: `${hrs}:${mins}:${secs}`,
      progressPercent
    };
  }, [logs, selectedUser, currentTime]);

  const activeShift = React.useMemo(() => {
    if (!selectedUser) return null;
    const todayStr = getLocalDateString();
    return schedules.find(s => {
      const isDateMatch = s.date === todayStr;
      if (!isDateMatch) return false;

      const isIdMatch = s.technicianId === selectedUser.id;
      const isEmailMatch = s.technicianEmail?.toLowerCase() === selectedUser.email?.toLowerCase();
      const isNameMatch = s.technicianName?.toLowerCase() === selectedUser.name?.toLowerCase();

      return isIdMatch || isEmailMatch || isNameMatch;
    });
  }, [selectedUser, schedules]);

  const activeLeave = React.useMemo(() => {
    if (!selectedUser || leavesList.length === 0) return null;
    const todayStr = getLocalDateString();
    return leavesList.find(l => {
      if (l.status !== 'Approved') return false;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const check = new Date(todayStr);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      check.setHours(0,0,0,0);
      
      const isIdMatch = l.employeeId === (selectedUser.employeeId || 'APEC-MEMBER');
      const isEmailMatch = l.employeeEmail?.toLowerCase() === selectedUser.email?.toLowerCase();
      
      return (isIdMatch || isEmailMatch) && check >= start && check <= end;
    });
  }, [selectedUser, leavesList]);

  const activeProject = React.useMemo(() => {
    if (!activeShift) return null;
    return projectsList.find(p => p.id === activeShift.projectId);
  }, [activeShift, projectsList]);

  const resolvedCoordinates = React.useMemo(() => {
    if (!activeProject) return null;
    let lat = Number(activeProject.latitude);
    let lng = Number(activeProject.longitude);
    if (isNaN(lat) || isNaN(lng) || activeProject.latitude === undefined || activeProject.longitude === undefined) {
      const defaults = getDefaultCoordinates(activeProject.site || activeProject.name || '');
      lat = defaults.latitude;
      lng = defaults.longitude;
    }
    return { latitude: lat, longitude: lng };
  }, [activeProject]);

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
          { id: 'admin-1', name: 'Admin User', email: 'admin@apecpowersolutions.com', employeeId: 'APEC-0001', branch: 'Vijayawada', role: 'System Administrator' },
          { id: 'md-1', name: 'Managing Director', email: 'managingdirector@apecpowersolutions.com', employeeId: 'APEC-0002', branch: 'Vijayawada', role: 'Managing Director' },
          { id: 'tech-1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', branch: 'Karimnagar', role: 'Lead Field Engineer' }
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
        branch: userProfile?.branch || userProfile?.department || 'Vijayawada',
        role: userProfile?.role || 'Staff Member'
      });
    }
  }, [teamList, userProfile]);

  // Load schedules and projects
  useEffect(() => {
    if (!db) {
      // Offline fallback mock data
      setProjectsList([
        { id: '1', name: 'Grid Substation Hubli', site: 'Hubli Substation', latitude: 15.3647, longitude: 75.1240 },
        { id: '2', name: 'Koppal Wind Farm', site: 'Koppal Wind Farm', latitude: 15.3533, longitude: 76.1554 },
        { id: '3', name: 'Dharwad Solar Hub', site: 'Dharwad Solar Hub', latitude: 15.4589, longitude: 75.0078 }
      ]);
      setSchedules([
        { id: '1', technicianId: 'tech-1', technicianName: 'Rahul Sharma', projectId: '1', projectName: 'Grid Substation Hubli', date: getLocalDateString(), time: '08:00 - 17:00', status: 'Scheduled' }
      ]);
      return;
    }

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjectsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error('Projects subscription error in Attendance:', err);
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error('Schedules subscription error in Attendance:', err);
    });

    const unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      setLeavesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error('Leaves subscription error in Attendance:', err);
    });

    return () => {
      unsubProjects();
      unsubSchedules();
      unsubLeaves();
    };
  }, []);
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

  }, []);

  // Automatically restore watcher session and interval timer if a check-in session is active
  useEffect(() => {
    const savedId = localStorage.getItem('apec_bg_watcher_id');
    if (savedId && selectedUser) {
      bgWatcherIdRef.current = savedId;
      const empId = selectedUser.employeeId || 'APEC-MEMBER';
      const empName = selectedUser.name;
      const empEmail = selectedUser.email;
      startBackgroundTracking(empId, empName, empEmail);
      startPeriodicLocationTimer(empId, empName, empEmail);
    }
    return () => {
      if (bgTimerRef.current) {
        clearInterval(bgTimerRef.current);
        bgTimerRef.current = null;
      }
    };
  }, [selectedUser]);

  // Start periodic 1-minute location tracking timer
  const startPeriodicLocationTimer = (empId: string, empName: string, empEmail: string) => {
    if (bgTimerRef.current) {
      clearInterval(bgTimerRef.current);
    }

    const logLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const acc = position.coords.accuracy;
          if (db) {
            try {
              // Bypassing geocoding to save mobile data usage!
              const addressStr = "Background Telemetry";
              await addDoc(collection(db, 'telemetry'), {
                employeeId: empId,
                userName: empName,
                userEmail: empEmail,
                type: 'telemetry',
                photoUrl: null,
                location: {
                  latitude: lat,
                  longitude: lon,
                  accuracy: acc || 0,
                  address: addressStr
                },
                timestamp: Timestamp.fromDate(new Date())
              });
              console.log("Logged periodic background telemetry.");
            } catch (err) {
              console.error("Periodic background write failed:", err);
            }
          }
        },
        (err) => {
          console.error("Periodic background location check failed:", err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    // Run every 1 minute (60,000ms)
    bgTimerRef.current = setInterval(logLocation, 60000);
  };

  // Start background location tracking watcher
  const startBackgroundTracking = async (empId: string, empName: string, empEmail: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      // Prevent duplicate trackers
      await stopBackgroundTracking();

      // Request notification permission on Android 13+ so the foreground service notification can display
      if ('Notification' in window && (Notification as any).permission !== 'granted') {
        try {
          await (Notification as any).requestPermission();
        } catch (notifErr) {
          console.error("Failed to request notification permission:", notifErr);
        }
      }

      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: "APEC Location Tracking Active",
          backgroundMessage: "Your location is recorded for active shift verification.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 0 // update irrespective of distance change
        },
        async (location, error) => {
          if (error) {
            console.error('Background geolocation error:', error);
            return;
          }
          if (location && db) {
            const lat = location.latitude;
            const lon = location.longitude;
            const acc = location.accuracy;

            // Bypassing geocoding for background tracking to save data!
            const addressStr = "Background Telemetry";

            try {
              // Add a background location update to the telemetry collection
              await addDoc(collection(db, 'telemetry'), {
                employeeId: empId,
                userName: empName,
                userEmail: empEmail,
                type: 'telemetry',
                photoUrl: null,
                location: {
                  latitude: lat,
                  longitude: lon,
                  accuracy: acc || 0,
                  address: addressStr
                },
                timestamp: Timestamp.fromDate(new Date())
              });
              console.log("Logged background geolocation coordinate update.");
            } catch (fsErr) {
              console.error("Failed to save background coordinates:", fsErr);
            }
          }
        }
      );

      bgWatcherIdRef.current = watcherId;
      localStorage.setItem('apec_bg_watcher_id', watcherId);
      console.log("Started background tracking. Watcher ID:", watcherId);

      // Start native FusedLocation updates that run even when closed/killed
      const apiKey = app?.options?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY;
      const projectId = app?.options?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const currentUser = auth?.currentUser;
      const refreshToken = currentUser ? ((currentUser as any).refreshToken || (currentUser as any).stsTokenManager?.refreshToken) : null;

      try {
        const NativeTracking = registerPlugin<any>('NativeTracking');
        await NativeTracking.startTracking({
          employeeId: empId,
          userName: empName,
          userEmail: empEmail,
          apiKey: apiKey,
          refreshToken: refreshToken,
          projectId: projectId
        });
        console.log("Started native FusedLocation background updates.");
      } catch (nativeErr) {
        console.error("Failed to start native FusedLocation updates:", nativeErr);
      }
    } catch (err) {
      console.error("Failed to launch background location watcher:", err);
      alert("Notice: Could not start background location tracking. Please ensure that Location permissions are set to 'Allow all the time' in your phone's settings.");
    }
  };

  // Stop background location tracking watcher
  const stopBackgroundTracking = async () => {
    const watcherId = bgWatcherIdRef.current || localStorage.getItem('apec_bg_watcher_id');
    if (watcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: watcherId });
        bgWatcherIdRef.current = null;
        localStorage.removeItem('apec_bg_watcher_id');
        console.log("Stopped background tracking. Watcher ID cleared.");
      } catch (err) {
        console.error("Failed to remove background watcher:", err);
      }
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const NativeTracking = registerPlugin<any>('NativeTracking');
        await NativeTracking.stopTracking();
        console.log("Stopped native FusedLocation background updates.");
      } catch (nativeErr) {
        console.error("Failed to stop native FusedLocation updates:", nativeErr);
      }
    }
  };

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
      let geofenceStatus: any = null;

      if (punchType === 'punch_in') {
        if (activeShift && resolvedCoordinates) {
          const dist = getHaversineDistance(
            coords.latitude,
            coords.longitude,
            resolvedCoordinates.latitude,
            resolvedCoordinates.longitude
          );
          geofenceStatus = {
            isVerifiedOnSite: dist <= 500,
            distanceMeters: dist,
            assignedProjectName: activeShift.projectName,
            status: dist <= 500 ? 'Verified' : 'Off-Site'
          };
        } else {
          geofenceStatus = {
            isVerifiedOnSite: false,
            distanceMeters: null,
            assignedProjectName: null,
            status: 'Unscheduled'
          };
        }
      }

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

      if (geofenceStatus) {
        payload.geofenceStatus = geofenceStatus;
      }

      const now = new Date();

      if (db && !isFallbackMode) {
        // Save to firestore
        await addDoc(collection(db, 'attendance'), {
          ...payload,
          timestamp: Timestamp.fromDate(now)
        });

        // Mirror manual punches to telemetry collection for live tracking map route lines
        await addDoc(collection(db, 'telemetry'), {
          employeeId: payload.employeeId,
          userName: payload.userName,
          userEmail: payload.userEmail,
          type: punchType, // 'punch_in' or 'punch_out'
          photoUrl: payload.photoUrl,
          location: payload.location,
          timestamp: Timestamp.fromDate(now)
        });

        // Add to recent activity log
        let activityDesc = `Location: ${payload.location.address.slice(0, 50)}...`;
        if (geofenceStatus) {
          if (geofenceStatus.status === 'Verified') {
            activityDesc = `📍 Verified On-Site (${geofenceStatus.assignedProjectName}) · ${activityDesc}`;
          } else if (geofenceStatus.status === 'Off-Site') {
            activityDesc = `⚠️ Off-Site (${(geofenceStatus.distanceMeters / 1000).toFixed(2)} km from ${geofenceStatus.assignedProjectName}) · ${activityDesc}`;
          }
        }

        await addDoc(collection(db, 'activities'), {
          title: `${selectedUser.name} Punched ${punchType === 'punch_in' ? 'In' : 'Out'}`,
          desc: activityDesc,
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

      // Find duration if punch out
      let durationStr = '';
      if (punchType === 'punch_out') {
        const todayStr = new Date().toDateString();
        const correspondingPunchIn = logs.find(l =>
          l.employeeId === (selectedUser.employeeId || 'APEC-MEMBER') &&
          l.type === 'punch_in' &&
          new Date(l.timestamp).toDateString() === todayStr
        );
        if (correspondingPunchIn) {
          const inTime = new Date(correspondingPunchIn.timestamp).getTime();
          const diffMs = now.getTime() - inTime;
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${diffHrs}h ${diffMins}m`;
        }
      }

      setPunchSuccess({ type: punchType, time: now, duration: durationStr });

      // Handle mobile background location tracking hooks
      if (punchType === 'punch_in') {
        // Request battery optimization bypass BEFORE starting tracking.
        // This is critical on Android - without it the OS kills the service after ~2 mins.
        if (Capacitor.isNativePlatform()) {
          try {
            const BatteryOpt = registerPlugin<any>('BatteryOpt');
            await BatteryOpt.requestIgnore();
            console.log('Battery optimization bypass requested.');
          } catch (batteryErr) {
            console.warn('Battery opt bypass request failed (non-fatal):', batteryErr);
          }
        }
        startBackgroundTracking(
          selectedUser.employeeId || 'APEC-MEMBER',
          selectedUser.name,
          selectedUser.email
        );
        startPeriodicLocationTimer(
          selectedUser.employeeId || 'APEC-MEMBER',
          selectedUser.name,
          selectedUser.email
        );
      } else {
        stopBackgroundTracking();
        if (bgTimerRef.current) {
          clearInterval(bgTimerRef.current);
          bgTimerRef.current = null;
        }
      }
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
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
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
  }, [logs, isUserAdmin, activeEmail, searchTerm, typeFilter, dateFilter]);

  // Ensure camera stops when leaving route
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Header Panel - Hidden on mobile to save viewport space */}
      <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-2xl relative overflow-hidden">
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">

        {/* PUNCH CARD INTERFACE */}
        <div className="xl:col-span-6 h-full flex flex-col">
          <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl relative overflow-hidden h-full flex flex-col">

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
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900 relative">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  Console Simulator (Select Team Member)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSimulatedTechDropdownOpen(!isSimulatedTechDropdownOpen)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer flex justify-between items-center text-left"
                  >
                    <span>
                      {selectedUser
                        ? `${selectedUser.name} (${selectedUser.employeeId || 'N/A'}) - ${selectedUser.role}`
                        : 'Select Team Member...'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isSimulatedTechDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isSimulatedTechDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsSimulatedTechDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-2xl p-1 space-y-0.5"
                        >
                          {teamList.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(t);
                                setIsSimulatedTechDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold ${selectedUser?.id === t.id
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'text-slate-300 hover:bg-slate-800 border border-transparent'
                                }`}
                            >
                              {t.name} ({t.employeeId || 'N/A'}) - {t.role}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
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
                    {selectedUser.branch || selectedUser.department || 'Vijayawada'}
                  </span>
                </div>
              </div>
            )}

            {/* Today's Assignment Sub-card */}
            {selectedUser && (
              <div className={`p-3 border rounded-xl space-y-2 ${activeLeave ? 'bg-rose-950/20 border-rose-900/30' : 'bg-slate-900/40 border-slate-800/60'}`}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className={`w-3.5 h-3.5 ${activeLeave ? 'text-rose-400' : 'text-cyan-400'}`} />
                    Today's Assignment
                  </span>
                  {activeLeave ? (
                    <span className="text-[9px] text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      ON LEAVE
                    </span>
                  ) : (
                    <span className="text-[9px] text-cyan-400 font-mono">
                      {activeShift ? activeShift.time : 'No Shift Scheduled'}
                    </span>
                  )}
                </div>
                {activeLeave ? (
                  <div className="space-y-1 mt-1">
                    <p className="text-xs font-bold text-rose-300">
                      {activeLeave.leaveType} Leave Approved
                    </p>
                    <p className="text-[10px] text-rose-400/70 italic leading-tight">
                      You are officially on leave today. Attendance punch is not required.
                    </p>
                  </div>
                ) : activeShift ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">
                          {activeShift.projectName}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Site: {activeProject?.site || 'APEC Site'}
                        </p>
                      </div>
                      {resolvedCoordinates && (
                        <div className="text-right text-[9px] text-slate-500 font-mono">
                          <span>{resolvedCoordinates.latitude.toFixed(4)}, {resolvedCoordinates.longitude.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic">
                    No active project shift scheduled for today. Geofencing verification will be marked as unscheduled.
                  </p>
                )}
              </div>
            )}

            {/* Capture Panel Viewport */}
            <div className="relative aspect-video rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-inner group">
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
                    {punchSuccess.duration && (
                      <div className="mt-3 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-xs font-bold text-emerald-400">Session Duration: {punchSuccess.duration}</p>
                      </div>
                    )}
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

              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl space-y-2 text-xs font-mono">
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

            {/* EMPLOYEE WORK SESSION */}
            <div className="mt-4 p-4 rounded-xl border border-slate-800/60 bg-slate-950/20 shadow-inner relative overflow-hidden">
               <div className="flex justify-between items-center mb-3 border-b border-slate-800/80 pb-3">
                 <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                   <Clock className="w-4 h-4 text-cyan-400" />
                   Employee Work Session
                 </h3>
                 {workSessionData.isWorking ? (
                   <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                     <Clock className="w-3 h-3" />
                     Working
                   </span>
                 ) : (
                   <span className="px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                     Offline
                   </span>
                 )}
               </div>
               
               <div className="text-center py-2 mb-2">
                 <div className="text-3xl font-black text-slate-100 tracking-wide font-mono drop-shadow-md">
                   {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                 </div>
                 <div className="text-xs text-slate-400 mt-1.5 font-medium">
                   {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                 </div>
               </div>

               <div className="mb-5 px-1">
                 <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5">
                   <span>Work Progress</span>
                   <span className="text-cyan-400">{workSessionData.progressPercent}%</span>
                 </div>
                 <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                   <div 
                     className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)] relative"
                     style={{ width: `${workSessionData.progressPercent}%` }}
                   >
                     <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_infinite]" />
                   </div>
                 </div>
                 <div className="flex justify-between text-[9px] text-slate-500 mt-1.5 font-medium">
                   <span>0 hrs</span>
                   <span>9 hrs Goal</span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 text-center flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Work Duration</span>
                   <span className="text-xl font-bold text-slate-100 mt-1 tracking-wider font-mono">
                     {workSessionData.isWorking ? workSessionData.durationStr : "00:00:00"}
                   </span>
                 </div>
                 <div className="bg-orange-950/10 border border-orange-900/20 rounded-xl p-3.5 text-center flex flex-col items-center justify-center shadow-sm">
                   <span className="text-[10px] text-orange-400/80 font-bold uppercase tracking-wider">End Work Duration</span>
                   <span className="text-xl font-bold text-orange-400/90 mt-1 tracking-wider font-mono opacity-80">
                     {!workSessionData.isWorking && workSessionData.progressPercent > 0 ? workSessionData.durationStr : "00:00:00"}
                   </span>
                 </div>
               </div>
            </div>

          </div>
        </div>

        {/* ATTENDANCE HISTORY LIST */}
        <div className="xl:col-span-6 relative">
          <div className="xl:absolute xl:inset-0 h-full w-full">
            <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl h-full flex flex-col">

            {/* Header controls & export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Attendance History Registry
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Showing verified logs matching filter credentials</p>
              </div>

              {isUserAdmin && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredLogs.length === 0}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              )}
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
              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 no-scrollbar max-h-[600px] xl:max-h-none">
                {filteredLogs.map((log) => {
                  const isPunchIn = log.type === 'punch_in';
                  const logDate = new Date(log.timestamp);

                  let workDuration = '';
                  let punchInTime = '';
                  if (!isPunchIn) {
                    const punchOutTime = logDate.getTime();
                    const correspondingPunchIn = logs.find(l =>
                      l.employeeId === log.employeeId &&
                      l.type === 'punch_in' &&
                      new Date(l.timestamp).getTime() < punchOutTime &&
                      new Date(l.timestamp).toDateString() === logDate.toDateString()
                    );
                    if (correspondingPunchIn) {
                      const inTime = new Date(correspondingPunchIn.timestamp).getTime();
                      const diffMs = punchOutTime - inTime;
                      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      workDuration = `${diffHrs}h ${diffMins}m`;
                      punchInTime = new Date(correspondingPunchIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition-all flex gap-3.5"
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
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider border leading-none ${isPunchIn
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
                              : 'bg-rose-500/10 text-rose-455 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.05)]'
                              }`}>
                              {isPunchIn ? 'Punch In' : 'Punch Out'}
                            </span>
                            {isPunchIn && log.geofenceStatus && (
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider border leading-none ${log.geofenceStatus.status === 'Verified'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.05)]'
                                : log.geofenceStatus.status === 'Off-Site'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.05)]'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                {log.geofenceStatus.status === 'Verified' && '📍 Verified On-Site'}
                                {log.geofenceStatus.status === 'Off-Site' && `⚠️ Off-Site (${(log.geofenceStatus.distanceMeters / 1000).toFixed(2)} km)`}
                                {log.geofenceStatus.status === 'Unscheduled' && 'Unscheduled'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location address */}
                        <div className="pt-1 flex flex-col gap-0.5 text-[10px] text-slate-450 leading-relaxed font-mono">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                            <span className="truncate flex-1" title={log.location?.address}>
                              {log.location?.address || 'Unknown coordinates'}
                            </span>
                          </div>
                          {isPunchIn && log.geofenceStatus && log.geofenceStatus.assignedProjectName && (
                            <div className="text-[9.5px] text-slate-500 pl-4">
                              Assigned Target: <span className="text-slate-400 font-semibold">{log.geofenceStatus.assignedProjectName}</span>
                            </div>
                          )}
                          {!isPunchIn && workDuration && (
                            <div className="flex items-center gap-3 mt-2 p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                              <div className="flex items-center gap-1.5 text-emerald-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-semibold text-[10px]">In: {punchInTime}</span>
                              </div>
                              <div className="w-px h-3 bg-slate-700"></div>
                              <div className="flex items-center gap-1.5 text-cyan-400">
                                <Loader2 className="w-3.5 h-3.5" />
                                <span className="font-semibold text-[10px]">Work Duration: {workDuration}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Date and actions */}
                        <div className="pt-1.5 border-t border-slate-900/60 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{logDate.toLocaleDateString()}</span>
                            <span className="text-slate-700">|</span>
                            <Clock className={`w-3 h-3 ${isPunchIn ? 'text-emerald-400' : 'text-rose-400'}`} />
                            <span className={`${isPunchIn ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}`}>
                              {logDate.toLocaleTimeString()}
                            </span>
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
        </div>

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
