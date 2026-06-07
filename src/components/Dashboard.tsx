import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  TrendingUp,
  X,
  Loader2,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, doc, deleteDoc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Real-time Firestore States
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Counts derived from real-time snapshot lists
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDbActionLoading, setIsDbActionLoading] = useState(false);

  // Forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('Active');
  const [newProjectSite, setNewProjectSite] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);

  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Projects', icon: Activity },
    { name: 'Inventory', icon: Package },
    { name: 'Team', icon: Users },
    { name: 'Chat', icon: MessageSquare },
    { name: 'Settings', icon: Settings },
  ];

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'Chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // 1. Projects listener
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(projs);
      setActiveProjectsCount(projs.filter((p: any) => p.status === 'Active').length);
    });

    // 2. Alerts listener
    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (snapshot) => {
      const alts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlertsList(alts);
      setPendingAlertsCount(alts.filter((a: any) => a.status === 'pending').length);
    });

    // 3. Tasks listener
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasksList(tks);
      setCompletedTasksCount(tks.filter((t: any) => t.status === 'completed').length);
    });

    // 4. Inventory listener
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventoryList(items);
    });

    // 5. Team listener
    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamList(members);
    });

    // 6. Activities listener
    const qActivities = query(collection(db, 'activities'));
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      const sortedActs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
        .map((data: any) => {
          let timeStr = 'Just now';
          if (data.timestamp) {
            const seconds = data.timestamp.seconds;
            const diff = (Timestamp.now().seconds - seconds);
            if (diff > 86400) {
              timeStr = `${Math.floor(diff / 86400)}d ago`;
            } else if (diff > 3600) {
              timeStr = `${Math.floor(diff / 3600)}h ago`;
            } else if (diff > 60) {
              timeStr = `${Math.floor(diff / 60)}m ago`;
            } else {
              timeStr = 'Just now';
            }
          }
          return {
            id: data.id,
            title: data.title,
            desc: data.desc,
            time: timeStr,
            type: data.type
          };
        });
      setActivitiesList(sortedActs);
      setIsLoading(false);
    });

    return () => {
      unsubProjects();
      unsubAlerts();
      unsubTasks();
      unsubInventory();
      unsubTeam();
      unsubActivities();
    };
  }, []);

  // Real-time Chat Listener
  useEffect(() => {
    if (!db || activeTab !== 'Chat') return;

    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let timeStr = '';
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnapshot.id,
          senderEmail: data.senderEmail,
          text: data.text,
          time: timeStr
        };
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const seedDemoData = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await clearDatabaseHelper();

      // Seed projects
      const projects = [
        { name: 'Project Alpha (Grid Substation)', status: 'Active', site: 'Site A - Hubli', manager: 'John Doe' },
        { name: 'Project Beta (Solar Farm)', status: 'Active', site: 'Site B - Belgaum', manager: 'Jane Smith' },
        { name: 'Project Gamma (Transmission Lines)', status: 'Pending', site: 'Site C - Dharwad', manager: 'Mike Johnson' },
      ];
      for (const p of projects) {
        await addDoc(collection(db, 'projects'), p);
      }

      // Seed alerts
      const alerts = [
        { title: 'Copper wiring running low', severity: 'high', status: 'pending' },
        { title: 'Safety inspection pending', severity: 'medium', status: 'pending' },
        { title: 'Delayed shipment - Concrete', severity: 'low', status: 'pending' },
      ];
      for (const a of alerts) {
        await addDoc(collection(db, 'alerts'), a);
      }

      // Seed tasks
      for (let i = 0; i < 5; i++) {
        await addDoc(collection(db, 'tasks'), { title: `Completed Safety Task ${i + 1}`, status: 'completed' });
      }

      // Seed activities
      const activities = [
        { title: 'New equipment logged', desc: 'Added 4 generators to Site A', type: 'package', timestamp: Timestamp.now() },
        { title: 'Phase 2 Approved', desc: 'Project Alpha cleared for next stage', type: 'task', timestamp: new Timestamp(Timestamp.now().seconds - 3600, 0) },
        { title: 'Low Inventory Alert', desc: 'Copper wiring running low', type: 'alert', timestamp: new Timestamp(Timestamp.now().seconds - 10800, 0) },
      ];
      for (const act of activities) {
        await addDoc(collection(db, 'activities'), act);
      }

      // Seed inventory
      const inventory = [
        { name: 'Copper Wiring 10mm', quantity: 120, unit: 'meters', status: 'Low Stock' },
        { name: 'Steel Reinforcement Rods', quantity: 15, unit: 'tons', status: 'In Stock' },
        { name: 'Portable Generators 5kW', quantity: 4, unit: 'units', status: 'In Stock' },
        { name: 'Electrical PVC Conduits', quantity: 0, unit: 'meters', status: 'Out of Stock' },
      ];
      for (const inv of inventory) {
        await addDoc(collection(db, 'inventory'), inv);
      }

      // Seed team
      const team = [
        { name: 'John Doe', role: 'Project Manager', email: 'john.doe@apec.com', status: 'Active' },
        { name: 'Jane Smith', role: 'Electrical Engineer', email: 'jane.smith@apec.com', status: 'Site Visit' },
        { name: 'Mike Johnson', role: 'Safety Inspector', email: 'mike.j@apec.com', status: 'Active' },
        { name: 'Sarah Connor', role: 'Operations Lead', email: 's.connor@apec.com', status: 'On Leave' },
      ];
      for (const t of team) {
        await addDoc(collection(db, 'team'), t);
      }

      // Seed greeting message
      await addDoc(collection(db, 'messages'), {
        text: 'Welcome to the APEC ERP Chat Room! Real-time database synchronizations are now fully configured.',
        senderEmail: 'system@apec.com',
        timestamp: Timestamp.now()
      });

    } catch (err) {
      console.error('Error seeding data:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const clearDatabaseHelper = async () => {
    if (!db) return;
    const collections = ['projects', 'alerts', 'tasks', 'activities', 'inventory', 'team', 'messages'];
    for (const colName of collections) {
      const snapshot = await getDocs(collection(db, colName));
      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, colName, docSnapshot.id));
      }
    }
  };

  const clearDatabase = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await clearDatabaseHelper();
    } catch (err) {
      console.error('Error clearing database:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !db) return;
    setIsDbActionLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        status: newProjectStatus,
        site: newProjectSite || 'General Site',
        manager: newProjectManager || 'Unassigned'
      });
      // Add activity
      await addDoc(collection(db, 'activities'), {
        title: 'New project registered',
        desc: `Project "${newProjectName}" was added under ${newProjectSite || 'General Site'}`,
        type: 'task',
        timestamp: Timestamp.now()
      });
      setNewProjectName('');
      setNewProjectSite('');
      setNewProjectManager('');
      setIsAddingProject(false);
    } catch (err) {
      console.error('Error adding project:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteDocument = async (colName: string, id: string, docNameForLog?: string) => {
    if (!db) return;
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !db) return;
    const text = newMessageText;
    setNewMessageText('');
    try {
      await addDoc(collection(db, 'messages'), {
        text,
        senderEmail: auth?.currentUser?.email || 'admin@apec.com',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const stats = [
    { title: 'Active Projects', value: isLoading ? '...' : activeProjectsCount.toString(), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { title: 'Pending Alerts', value: isLoading ? '...' : pendingAlertsCount.toString(), icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { title: 'Completed Tasks', value: isLoading ? '...' : completedTasksCount.toString(), icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
    { title: 'Efficiency Rate', value: '94%', icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-500/20' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'package':
        return { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
      case 'task':
        return { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
      case 'alert':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' };
      case 'settings':
      default:
        return { icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' };
    }
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
                onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
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
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
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
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-30">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            </div>
          ) : null}

          <div className="max-w-7xl mx-auto h-full flex flex-col">
            
            {/* Overview Tab Content */}
            {activeTab === 'Overview' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 lg:space-y-8 pb-10"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center justify-between group hover:bg-slate-900/80 transition-all hover:border-slate-700">
                      <div>
                        <p className="text-xs lg:text-sm font-medium text-slate-400 mb-1">{stat.title}</p>
                        <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner border border-white/5`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Split layouts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Chart */}
                  <div className="xl:col-span-2 p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col min-h-[350px] lg:min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Project Analytics</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Monthly workflow distribution</p>
                      </div>
                    </div>
                    {projectsList.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <TrendingUp className="w-12 h-12 text-slate-700 mb-2" />
                        <p className="text-sm font-medium text-slate-400">No project data to analyze</p>
                        <p className="text-xs text-slate-600 mt-1">Please populate database in Settings or Projects tab.</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-end gap-1.5 sm:gap-2 pb-6 pt-4 px-1 lg:px-4 h-full border-b border-slate-800/50 relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                          {[100, 75, 50, 25, 0].map(val => (
                             <div key={val} className="w-full border-t border-slate-800/30 flex items-center" />
                          ))}
                        </div>
                        {[40, 70, 45, 90, 65, 85, 100, 50, 75, 60, 30, 80].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                            <div 
                              className="w-full bg-gradient-to-t from-red-900/40 to-red-500/40 group-hover:to-red-500/60 rounded-t-md transition-all relative border-x border-t border-red-500/20"
                              style={{ height: `${h}%` }}
                            >
                              <div className="absolute -top-1 left-0 right-0 h-1 bg-red-400 rounded-t-md opacity-70" />
                            </div>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 uppercase font-mono">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col min-h-[350px]">
                    <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                    {activitiesList.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <Package className="w-12 h-12 text-slate-700 mb-2" />
                        <p className="text-sm font-medium text-slate-400">No logs found</p>
                        <p className="text-xs text-slate-600 mt-1">Actions on database will be logged here.</p>
                      </div>
                    ) : (
                      <div className="space-y-6 flex-1 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
                        {activitiesList.slice(0, 5).map((item, i) => {
                          const iconData = getActivityIcon(item.type);
                          const Icon = iconData.icon;
                          return (
                            <div key={item.id || i} className="flex items-start gap-4 group">
                              <div className={`w-10 h-10 rounded-full ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-4 h-4 ${iconData.color}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{item.title}</p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{item.desc}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{item.time}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Projects Tab Content */}
            {activeTab === 'Projects' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">Project Directory</h3>
                    <p className="text-xs text-slate-400 mt-1">APEC active and pipeline installations</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingProject(!isAddingProject)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    {isAddingProject ? <ArrowLeft className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isAddingProject ? 'Back to List' : 'Add Project'}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isAddingProject ? (
                    <motion.div 
                      key="project-form"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl"
                    >
                      <h4 className="text-sm font-semibold text-white mb-4">Register New APEC Installation</h4>
                      <form onSubmit={handleAddProject} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-400 uppercase ml-1">Project Name</label>
                          <input 
                            type="text" 
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="e.g. Grid Substation Hubli"
                            required
                            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400 uppercase ml-1">Status</label>
                            <select
                              value={newProjectStatus}
                              onChange={(e) => setNewProjectStatus(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Pending">Pending</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400 uppercase ml-1">Location Site</label>
                            <input 
                              type="text" 
                              value={newProjectSite}
                              onChange={(e) => setNewProjectSite(e.target.value)}
                              placeholder="e.g. Site A"
                              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-400 uppercase ml-1">Project Manager</label>
                          <input 
                            type="text" 
                            value={newProjectManager}
                            onChange={(e) => setNewProjectManager(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                          Submit Project
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="project-table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md"
                    >
                      {projectsList.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                          <Activity className="w-14 h-14 text-slate-800 mb-3" />
                          <p className="text-sm font-medium text-slate-400">No projects registered</p>
                          <p className="text-xs text-slate-600 mt-1">Get started by clicking Add Project or seeding database.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <th className="p-4">Project Name</th>
                                <th className="p-4">Site Location</th>
                                <th className="p-4">Project Manager</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                              {projectsList.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                                  <td className="p-4 font-medium text-white">{p.name}</td>
                                  <td className="p-4">{p.site}</td>
                                  <td className="p-4">{p.manager}</td>
                                  <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      p.status === 'Active' ? 'bg-green-500/10 text-green-400' :
                                      p.status === 'Completed' ? 'bg-blue-500/10 text-blue-400' :
                                      'bg-amber-500/10 text-amber-400'
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button 
                                      onClick={() => handleDeleteDocument('projects', p.id, p.name)}
                                      className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Inventory Tab Content */}
            {activeTab === 'Inventory' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">APEC Inventory</h3>
                  <p className="text-xs text-slate-400 mt-1">Track power solutions assets, cables, and equipment</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md">
                  {inventoryList.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                      <Package className="w-14 h-14 text-slate-800 mb-3" />
                      <p className="text-sm font-medium text-slate-400">Inventory is empty</p>
                      <p className="text-xs text-slate-600 mt-1">Populate items using the Seeding controls in Settings.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                            <th className="p-4">Item Description</th>
                            <th className="p-4">Available Quantity</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                          {inventoryList.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                              <td className="p-4 font-medium text-white">{item.name}</td>
                              <td className="p-4">{item.quantity} {item.unit}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  item.status === 'In Stock' ? 'bg-green-500/10 text-green-400' :
                                  item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => handleDeleteDocument('inventory', item.id, item.name)}
                                  className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Team Tab Content */}
            {activeTab === 'Team' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">Engineering Team</h3>
                  <p className="text-xs text-slate-400 mt-1">Registered technicians, safety personnel, and managers</p>
                </div>

                {teamList.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl py-20 text-center flex flex-col items-center shadow-lg backdrop-blur-md">
                    <Users className="w-14 h-14 text-slate-800 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No team members registered</p>
                    <p className="text-xs text-slate-600 mt-1">Populate profiles using Seeding settings.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {teamList.map((m) => (
                      <div key={m.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col relative group hover:border-slate-700 transition-all">
                        <button
                          onClick={() => handleDeleteDocument('team', m.id, m.name)}
                          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300 mb-4 shadow">
                          {m.name.slice(0,2).toUpperCase()}
                        </div>
                        <h4 className="text-base font-bold text-white leading-snug">{m.name}</h4>
                        <p className="text-xs text-red-500 font-semibold mt-0.5">{m.role}</p>
                        <p className="text-xs text-slate-500 mt-2 truncate font-mono">{m.email}</p>
                        <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Status</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            m.status === 'Active' ? 'bg-green-500/10 text-green-400' :
                            m.status === 'Site Visit' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Chat Tab Content */}
            {activeTab === 'Chat' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col min-h-[500px] bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md"
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Central Operations Channel</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time chat syncing live messages in Firestore</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                    <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Live Sync</span>
                  </div>
                </div>

                {/* Message list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[50vh] min-h-[350px] scrollbar-thin">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <MessageSquare className="w-12 h-12 text-slate-800 mb-2" />
                      <p className="text-sm font-medium text-slate-400">Operational channel is silent</p>
                      <p className="text-xs text-slate-600 mt-1">Send a message below to start chatting across devices!</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isCurrentUser = m.senderEmail === (auth?.currentUser?.email || 'admin@apec.com');
                      return (
                        <div 
                          key={m.id} 
                          className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                        >
                          <span className="text-[10px] text-slate-500 mb-1 px-1 font-semibold truncate max-w-[200px]">
                            {m.senderEmail}
                          </span>
                          <div className={`p-3 rounded-2xl text-sm ${
                            isCurrentUser 
                              ? 'bg-red-600 text-white rounded-tr-none' 
                              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                          }`}>
                            <p className="leading-normal break-words">{m.text}</p>
                            <span className={`block text-[8px] text-right mt-1.5 ${isCurrentUser ? 'text-white/60' : 'text-slate-500'}`}>
                              {m.time}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-3">
                  <input 
                    type="text" 
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type an operations update..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-sm placeholder:text-slate-600 text-white"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessageText.trim()}
                    className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* Settings Tab Content */}
            {activeTab === 'Settings' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold text-white">ERP System Settings</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure development utilities and database controls</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Database Seeder */}
                  <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-lg backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Firestore Database Management</h4>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Insert or clean mock documents to quickly evaluate how other views (Projects, Inventory, Team) handle live datasets and empty screens.
                      </p>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={seedDemoData}
                        disabled={isDbActionLoading}
                        className="flex-1 py-3 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Seed Demo Data'}
                      </button>
                      <button 
                        onClick={clearDatabase}
                        disabled={isDbActionLoading}
                        className="flex-1 py-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                      >
                        {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Clear Database'}
                      </button>
                    </div>
                  </div>

                  {/* Environment Config Info */}
                  <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-lg backdrop-blur-md">
                    <h4 className="text-sm font-semibold text-white">Active System Environment</h4>
                    <div className="mt-4 space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">Firebase Project:</span>
                        <span className="text-slate-300">apec-erp</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">Sender ID (No.):</span>
                        <span className="text-slate-300">477001925382</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">Database Engine:</span>
                        <span className="text-slate-300">Cloud Firestore</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500">ERP State:</span>
                        <span className="text-green-400 font-bold">CONNECTED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}
