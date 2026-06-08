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
  MessageSquare
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isDbActionLoading, setIsDbActionLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Auto-register logged-in users to the 'team' collection if not already present
  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        try {
          const q = query(collection(db, 'team'), where('email', '==', user.email));
          const snap = await getDocs(q);
          if (snap.empty) {
            await addDoc(collection(db, 'team'), {
              name: user.displayName || user.email.split('@')[0] || 'Unknown User',
              role: 'Team Member',
              email: user.email,
              status: 'Active'
            });
          }
        } catch (err) {
          console.error('Error auto-registering user in team:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Projects', icon: Activity },
    { name: 'Inventory', icon: Package },
    { name: 'Team', icon: Users },
    { name: 'Chat', icon: MessageSquare },
    { name: 'Settings', icon: Settings },
  ];

  // Helper to resolve active tab based on router pathname
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard/projects') return 'Projects';
    if (path === '/dashboard/inventory') return 'Inventory';
    if (path === '/dashboard/team') return 'Team';
    if (path === '/dashboard/chat') return 'Chat';
    if (path === '/dashboard/settings') return 'Settings';
    return 'Overview';
  };
  const activeTab = getActiveTab();

  const getPathForTab = (tabName: string) => {
    if (tabName === 'Overview') return '/dashboard';
    return `/dashboard/${tabName.toLowerCase()}`;
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative selection:bg-red-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-800/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 w-72 h-full bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-out shadow-2xl lg:shadow-none lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-700 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
               <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain p-0.5" onError={(e) => {
                 (e.currentTarget as HTMLImageElement).src = '/logo.png';
               }} />
             </div>
             <div>
                <h1 className="font-bold text-lg text-white leading-tight">APEC</h1>
                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">ERP System</p>
             </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(false)}>
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
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-red-600/20 to-transparent text-red-400 font-medium border border-red-500/20 shadow-[inset_4px_0_0_0_#ef4444]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-slate-500'}`} />
                {item.name}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/80 mb-4 shadow-inner">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white border border-slate-600 shadow-md">
              {auth?.currentUser?.email ? auth.currentUser.email.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{auth?.currentUser?.displayName || 'Admin User'}</p>
              <p className="text-xs text-slate-400 truncate">{auth?.currentUser?.email || 'admin@apec.com'}</p>
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative overflow-hidden h-full">
        {/* Header */}
        <header className="h-16 lg:h-20 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <div className="hidden md:flex relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-slate-900/80 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 w-48 lg:w-64 placeholder:text-slate-500 transition-all shadow-inner text-white"
              />
            </div>
            <button className="relative p-2 rounded-full hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-slate-950"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Switcher */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
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
            
            <Outlet context={{ firestoreError, setFirestoreError, isDbActionLoading, setIsDbActionLoading }} />
          </div>
        </div>
      </main>

    </div>
  );
}
