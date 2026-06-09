import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Shield
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isDbActionLoading, setIsDbActionLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth) {
      // Fallback local auth is admin
      setIsAdmin(true);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        const email = user.email.toLowerCase();
        
        // Check hardcoded admins first
        if (
          email === 'admin@apecpowersolutions.com' ||
          email === 'managingdirector@apecpowersolutions.com'
        ) {
          setIsAdmin(true);
        }

        if (db) {
          try {
            const q = query(collection(db, 'team'), where('email', '==', user.email));
            const unsubProfile = onSnapshot(q, (snap) => {
              if (!snap.empty) {
                const docData = snap.docs[0].data();
                setUserProfile({ id: snap.docs[0].id, ...docData });
                if (docData.accessRole === 'Admin' || docData.roleType === 'Admin') {
                  setIsAdmin(true);
                } else if (
                  email !== 'admin@apecpowersolutions.com' &&
                  email !== 'managingdirector@apecpowersolutions.com'
                ) {
                  // If not in hardcoded admin list and not marked as admin in DB
                  setIsAdmin(false);
                }
              } else {
                // Not found in team collection (but maybe firebase auth worked)
                if (
                  email !== 'admin@apecpowersolutions.com' &&
                  email !== 'managingdirector@apecpowersolutions.com'
                ) {
                  setIsAdmin(false);
                }
              }
            }, (err) => {
              console.error('Profile listener error:', err);
            });
            return () => unsubProfile();
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

    return () => unsubscribe();
  }, []);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Inventory', icon: Package },
    { name: 'Projects', icon: Activity },
    { name: 'Workforce', icon: Users },
    { name: 'Settings', icon: Settings },
    ...(isAdmin ? [{ name: 'Team Control', icon: Shield }] : [])
  ];

  // Helper to resolve active tab based on router pathname
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard/inventory') return 'Inventory';
    if (path === '/dashboard/projects') return 'Projects';
    if (path === '/dashboard/workforce') return 'Workforce';
    if (path === '/dashboard/settings') return 'Settings';
    if (path === '/dashboard/team-control') return 'Team Control';
    return 'Dashboard';
  };
  const activeTab = getActiveTab();

  const getPathForTab = (tabName: string) => {
    if (tabName === 'Dashboard') return '/dashboard';
    if (tabName === 'Team Control') return '/dashboard/team-control';
    return `/dashboard/${tabName.toLowerCase()}`;
  };

  return (
    <div className="h-screen w-full bg-[#070a13] flex font-sans text-slate-200 overflow-hidden relative selection:bg-cyan-500/15 selection:text-cyan-400">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-cyan-950/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] bg-rose-955/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 cyber-grid opacity-50"></div>
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
          <button className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { navigate(getPathForTab(item.name)); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-slate-200 border border-slate-750 shadow-sm shrink-0">
              {auth?.currentUser?.email ? auth.currentUser.email.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{auth?.currentUser?.displayName || 'Admin User'}</p>
              <p className="text-xs text-slate-400 truncate">{auth?.currentUser?.email || 'admin@apecpowersolutions.com'}</p>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative overflow-hidden h-full">
        {/* Header */}
        <header className="h-16 lg:h-20 border-b border-slate-800 bg-[#090d16]/70 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
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
            <button className="relative p-2 rounded-full hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <Bell className="w-5 h-5 text-slate-400 hover:text-slate-250" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Switcher */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* Database Connection Warning Banner */}
            {firestoreError && (
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

    </div>
  );
}
