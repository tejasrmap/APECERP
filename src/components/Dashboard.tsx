import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Menu,
  Activity,
  AlertTriangle,
  X,
  MessageSquare,
  Shield,
  Calendar,
  ShieldAlert,
  Clock,
  FileText,
  CalendarRange,
  Map,
  User,
  ClipboardList,
  Briefcase,
  History
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isDbActionLoading, setIsDbActionLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; desc: string; senderEmail: string } | null>(null);

  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(587.33, now, 0.15); // D5
      playTone(880.00, now + 0.1, 0.25); // A5
    } catch (e) {
      console.error('Audio chime play failed:', e);
    }
  };

  // Request native/browser notification permissions
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.error('Error requesting Capacitor local notification permissions:', e);
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    };
    requestNotificationPermission();
  }, []);

  // Listen to new direct messages globally
  useEffect(() => {
    if (!db || !auth) return;

    let unsubscribe: (() => void) | null = null;
    const authUnsub = auth.onAuthStateChanged((user) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      
      if (!user) return;
      const email = user.email || '';
      if (!email) return;

      const q = query(
        collection(db, 'messages'),
        where('recipientEmail', '==', email)
      );

      const listenerInitTime = Date.now();

      unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const msg = change.doc.data();
            const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate().getTime() : Date.now();

            if (msgTime > listenerInitTime - 5000) {
              const isChatPage = location.pathname === '/dashboard/workforce';
              const isBackground = document.hidden;

              if (!isChatPage || isBackground) {
                // 1. Play Audio Chime
                playChime();

                const titleText = `New Message from ${msg.senderName || 'Technician'}`;
                const bodyText = msg.text || 'Sent an attachment';

                // 2. Trigger native APK notification or browser push notification
                if (Capacitor.isNativePlatform()) {
                  try {
                    await LocalNotifications.schedule({
                      notifications: [
                        {
                          title: titleText,
                          body: bodyText,
                          id: Math.floor(Math.random() * 100000),
                          schedule: { at: new Date(Date.now() + 50) }
                        }
                      ]
                    });
                  } catch (e) {
                    console.error('Error scheduling native local notification:', e);
                  }
                } else {
                  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification(titleText, {
                      body: bodyText,
                      icon: '/logo.png'
                    });
                  }
                }

                // 3. Show In-App sliding Toast alert
                setActiveToast({
                  id: change.doc.id,
                  title: titleText,
                  desc: bodyText,
                  senderEmail: msg.senderEmail
                });

                // Auto-close toast
                setTimeout(() => {
                  setActiveToast(current => current?.id === change.doc.id ? null : current);
                }, 5000);
              }
            }
          }
        });
      }, (err) => {
        console.error('Real-time message notification listener error:', err);
      });
    });

    return () => {
      authUnsub();
      if (unsubscribe) unsubscribe();
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!db) {
      setNotifications([
        { id: '1', title: 'High Voltage Alert', desc: 'Transformer 3 temperature is high at Site Alpha', type: 'alert', timestamp: new Date() },
        { id: '2', title: 'New Permit Pending', desc: 'Rahul Sharma submitted electrical safety permit', type: 'permit', timestamp: new Date(Date.now() - 3600000) },
        { id: '3', title: 'Schedule Updated', desc: 'Your dispatch shift for Site Gamma is confirmed', type: 'schedule', timestamp: new Date(Date.now() - 7200000) }
      ]);
      return;
    }
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0) || 0;
        const tB = b.timestamp?.seconds || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0) || 0;
        return tB - tA;
      });
      setNotifications(list.slice(0, 8)); // Keep top 8
    }, (err) => {
      console.error('Notifications listener error:', err);
    });
    return () => unsubNotifications();
  }, []);

  useEffect(() => {
    if (!auth) {
      // Fallback local auth is admin
      setIsAdmin(true);
      return;
    }

    let unsubProfile: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Clear previous snapshot listener if active to prevent multiple listeners accumulation
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        const email = user.email ? user.email.toLowerCase() : '';
        const userPhone = user.phoneNumber || '';
        
        let cleanUserPhone = '';
        const isVirtual = email.endsWith('@apec-erp.local');
        if (isVirtual) {
          cleanUserPhone = email.split('@')[0];
        } else {
          cleanUserPhone = userPhone.replace(/[\s+-]/g, '');
        }
        
        // Check hardcoded admins first
        const isAdminEmail = 
          email === 'admin@apecpowersolutions.com' ||
          email === 'managingdirector@apecpowersolutions.com';

        const isAdminPhone = 
          userPhone === '+918499903275' || 
          cleanUserPhone === '918499903275';

        if (isAdminEmail || isAdminPhone) {
          setIsAdmin(true);
        }

        if (db) {
          try {
            let q = null;
            if (user.email && !isVirtual) {
              q = query(collection(db, 'team'), where('email', '==', user.email));
            } else if (user.phoneNumber || isVirtual) {
              const queryPhone = isVirtual ? cleanUserPhone : user.phoneNumber;
              q = query(collection(db, 'team'), where('phone', '==', queryPhone));
            }

            if (q) {
              unsubProfile = onSnapshot(q, (snap) => {
                if (!snap.empty) {
                  const docData = snap.docs[0].data();
                  setUserProfile({ id: snap.docs[0].id, ...docData });
                  if (docData.accessRole === 'Admin' || docData.roleType === 'Admin') {
                    setIsAdmin(true);
                  } else if (!isAdminEmail && !isAdminPhone) {
                    setIsAdmin(false);
                  }
                } else if (user.phoneNumber || isVirtual) {
                  // 3-phase fallback for sanitized/formatted phone numbers
                  const phoneCandidates = [
                    user.phoneNumber || '',
                    '+' + cleanUserPhone,
                    cleanUserPhone,
                    cleanUserPhone.slice(-10),
                  ].filter(Boolean);

                  const searchCandidates = async () => {
                    for (const candidate of phoneCandidates) {
                      const q2 = query(collection(db, 'team'), where('phone', '==', candidate));
                      const fallbackSnap = await getDocs(q2);
                      if (!fallbackSnap.empty) {
                        return fallbackSnap.docs[0];
                      }
                    }
                    if (cleanUserPhone.length >= 10) {
                      const allSnap = await getDocs(collection(db, 'team'));
                      const loginLast10 = cleanUserPhone.slice(-10);
                      for (const docSnap of allSnap.docs) {
                        const phoneVal = docSnap.data().phone;
                        const storedClean = (phoneVal !== undefined && phoneVal !== null ? String(phoneVal) : '').replace(/[\s+-]/g, '');
                        if (storedClean.length >= 10 && storedClean.slice(-10) === loginLast10) {
                          return docSnap;
                        }
                      }
                    }
                    return null;
                  };

                  searchCandidates().then(matchedDoc => {
                    if (matchedDoc) {
                      const docData = matchedDoc.data();
                      setUserProfile({ id: matchedDoc.id, ...docData });
                      if (docData.accessRole === 'Admin' || docData.roleType === 'Admin') {
                        setIsAdmin(true);
                      } else if (!isAdminEmail && !isAdminPhone) {
                        setIsAdmin(false);
                      }
                    } else if (!isAdminEmail && !isAdminPhone) {
                      setIsAdmin(false);
                    }
                  }).catch(e => console.error("3-phase phone lookup fallback failed:", e));
                } else if (!isAdminEmail && !isAdminPhone) {
                  setIsAdmin(false);
                }
              }, (err) => {
                console.error('Profile listener error:', err);
              });
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
          }
        }
      } else {
        // Double check local auth state
        const isLocalAuth = localStorage.getItem('isAuthenticated') === 'true';
        if (isLocalAuth) {
          setIsAdmin(true);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Redirect non-admins trying to access the main Dashboard (Overview)
  useEffect(() => {
    if (isDbActionLoading) return;
    if (auth && auth.currentUser && userProfile === null) return;

    if (!isAdmin && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
      navigate('/dashboard/my-profile', { replace: true });
    }
  }, [isAdmin, location.pathname, userProfile, isDbActionLoading, navigate]);

  const navItems = [
    { name: 'Attendance', icon: Clock },
    ...(isAdmin ? [{ name: 'Dashboard', icon: LayoutDashboard }] : []),
    { name: 'My Profile', icon: User },
    { name: 'Daily Reports', icon: ClipboardList },
    { name: 'Projects', icon: Activity },
    { name: 'Leads', icon: Briefcase },
    { name: 'Scheduling', icon: Calendar },
    { name: 'Leaves', icon: CalendarRange },
    { name: 'Workforce', icon: Users },
    ...(isAdmin ? [
      { name: 'Live Tracking', icon: Map },
      { name: 'Location History', icon: History },
      { name: 'Team Control', icon: Shield },
      { name: 'Reports', icon: FileText },
      { name: 'Settings', icon: Settings }
    ] : [])
  ];

  // Helper to resolve active tab based on router pathname
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard/projects') return 'Projects';
    if (path === '/dashboard/daily-reports') return 'Daily Reports';
    if (path === '/dashboard/scheduling') return 'Scheduling';
    if (path === '/dashboard/workforce') return 'Workforce';
    if (path === '/dashboard/settings') return 'Settings';
    if (path === '/dashboard/team-control') return 'Team Control';
    if (path === '/dashboard/live-tracking') return 'Live Tracking';
    if (path === '/dashboard/location-history') return 'Location History';
    if (path === '/dashboard/attendance') return 'Attendance';
    if (path === '/dashboard/reports') return 'Reports';
    if (path === '/dashboard/leaves') return 'Leaves';
    if (path === '/dashboard/my-profile') return 'My Profile';
    if (path === '/dashboard/leads') return 'Leads';

    return 'Dashboard';
  };
  const activeTab = getActiveTab();

  const getPathForTab = (tabName: string) => {
    if (tabName === 'Dashboard') return '/dashboard';
    if (tabName === 'Team Control') return '/dashboard/team-control';
    if (tabName === 'Live Tracking') return '/dashboard/live-tracking';
    if (tabName === 'Location History') return '/dashboard/location-history';
    if (tabName === 'My Profile') return '/dashboard/my-profile';
    if (tabName === 'Daily Reports') return '/dashboard/daily-reports';
    if (tabName === 'Leads') return '/dashboard/leads';

    return `/dashboard/${tabName.toLowerCase()}`;
  };

  return (
    <div className="h-[100dvh] w-full flex font-sans text-slate-200 overflow-hidden relative selection:bg-cyan-500/15 selection:text-cyan-400">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Vibrant Gradient Blobs */}
        <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent rounded-full blur-[100px] will-change-transform" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] bg-gradient-to-br from-rose-500/10 via-rose-500/2 to-transparent rounded-full blur-[120px] will-change-transform" />
        
        {/* Tech Dotted Grid */}
        <div 
          className="absolute inset-0 opacity-25" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        
        {/* Vignette fade to center */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,var(--bg-app)_80%)]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 w-72 h-full glass-sidebar flex flex-col transition-transform duration-300 ease-out shadow-2xl lg:shadow-none lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-900/60 flex items-center justify-center overflow-hidden border border-slate-700/80 shadow-md shrink-0">
               <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain p-0.5" onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
               }} />
             </div>
             <div>
                 <h1 className="font-bold text-lg text-slate-100 leading-tight">APEC</h1>
                 <p className="text-[9px] text-cyan-405 font-bold uppercase tracking-widest text-cyan-400">ERP System</p>
             </div>
          </div>
          <button className="lg:hidden p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95 duration-200" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setFirestoreError(null);
                  navigate(getPathForTab(item.name));
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors duration-150 ${
                  isActive 
                    ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 font-medium shadow-md glowing-active' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                {item.name}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 rounded-xl border border-slate-800/60 mb-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
            {userProfile?.photoUrl ? (
              <img 
                src={userProfile.photoUrl} 
                alt={userProfile.name || 'User'} 
                className="w-9 h-9 rounded-full object-cover border border-slate-750 shadow-sm shrink-0" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-slate-205 border border-slate-750 shadow-sm shrink-0">
                {userProfile?.name 
                  ? userProfile.name.slice(0, 2).toUpperCase() 
                  : (auth?.currentUser?.email && !auth.currentUser.email.endsWith('@apec-erp.local') 
                      ? auth.currentUser.email.slice(0, 2).toUpperCase() 
                      : 'EM')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {userProfile?.name || auth?.currentUser?.displayName || ((auth?.currentUser?.phoneNumber || (auth?.currentUser?.email && auth.currentUser.email.endsWith('@apec-erp.local'))) ? 'Employee' : 'Admin User')}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {userProfile?.email || 
                  (auth?.currentUser?.email && auth.currentUser.email.endsWith('@apec-erp.local') 
                    ? '+' + auth.currentUser.email.split('@')[0] 
                    : auth?.currentUser?.email || auth?.currentUser?.phoneNumber || 'admin@apecpowersolutions.com')}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              localStorage.removeItem('isAuthenticated');
              if (auth) {
                try {
                  await auth.signOut();
                } catch (err) {
                  console.error('Sign out failed:', err);
                }
              }
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-950/20 hover:text-rose-450 transition-colors border border-transparent hover:border-rose-900/30"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          
          <div className="mt-3 pt-3 border-t border-slate-800/60 text-center">
            <p className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">
              Made by <span className="text-cyan-400 font-bold">GT INNOX LLP</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative overflow-hidden h-full">
        {/* Header */}
        <header className="h-16 lg:h-20 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors active:scale-95 duration-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-slate-100 tracking-tight">
              {activeTab === 'Workforce' ? 'Communication Center' : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <div className="hidden md:flex relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text" 
                placeholder={activeTab === 'Workforce' ? "Search across all channels..." : "Search resources..."}
                className="bg-slate-900/80 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 w-48 lg:w-64 placeholder:text-slate-500 transition-all text-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative p-2 rounded-full transition-colors duration-150 border ${isNotificationsOpen ? 'bg-slate-800/80 border-slate-700 text-cyan-400' : 'hover:bg-slate-800 border-transparent hover:border-slate-700 text-slate-400 hover:text-slate-200'}`}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900"></span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-[#0e1422] p-4 rounded-2xl shadow-2xl z-40 border border-white/10 space-y-3 max-h-96 overflow-y-auto"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Control Room Alerts</span>
                        <button 
                          onClick={() => setNotifications([])}
                          className="text-[10px] text-slate-500 hover:text-rose-450 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-550 text-xs">
                          No active notifications.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {notifications.map((n) => (
                            <div key={n.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition-colors duration-100 text-xs flex gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                n.type === 'alert' ? 'bg-rose-500 animate-pulse' :
                                n.type === 'permit' ? 'bg-cyan-500' :
                                'bg-green-500'
                              }`} />
                              <div>
                                <h5 className="font-bold text-slate-200">{n.title}</h5>
                                <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">{n.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dashboard Content Switcher */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* Database Connection Warning Banner */}
            {firestoreError && activeTab !== 'My Profile' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-3 shrink-0 mb-6">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <h4 className="font-bold text-sm text-white">Firestore Connection Warning</h4>
                  <p className="mt-1 opacity-80 leading-relaxed">
                    {firestoreError === 'permission-denied'
                      ? 'Access denied. Your Firestore security rules are blocking database reads/writes. Please update your Firebase Console rules to allow access to authenticated users (e.g. "allow read, write: if request.auth != null;").'
                      : `Database connection error: ${firestoreError}. Please verify your .env credentials or check your internet connection.`}
                  </p>
                </div>
              </div>
            )}
            
            <Outlet context={{ firestoreError, setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile }} />
          </div>
        </div>
      </main>

      {/* In-App Toast Notification popup */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={() => {
              navigate('/dashboard/workforce');
              setActiveToast(null);
            }}
            className="fixed bottom-6 right-6 z-[100] max-w-sm bg-[#0e1422]/95 backdrop-blur-md border border-cyan-500/30 p-4 rounded-2xl shadow-[0_10px_35px_rgba(6,182,212,0.15)] flex gap-3 cursor-pointer hover:border-cyan-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                  {activeToast.title}
                </h4>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToast(null);
                  }}
                  className="p-0.5 rounded text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate pr-2">
                {activeToast.desc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
