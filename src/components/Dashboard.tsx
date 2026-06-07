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
  CheckCircle2,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Dynamic database states
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbActionLoading, setIsDbActionLoading] = useState(false);

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Projects', icon: Activity },
    { name: 'Inventory', icon: Package },
    { name: 'Team', icon: Users },
    { name: 'Settings', icon: Settings },
  ];

  const fetchData = async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Fetch active projects count
      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const activeProj = projectsSnapshot.docs.filter(d => d.data().status === 'Active').length;
      setActiveProjectsCount(activeProj);

      // 2. Fetch pending alerts count
      const alertsSnapshot = await getDocs(collection(db, 'alerts'));
      const pendingAl = alertsSnapshot.docs.filter(d => d.data().status === 'pending').length;
      setPendingAlertsCount(pendingAl);

      // 3. Fetch completed tasks count
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const completedTasks = tasksSnapshot.docs.filter(d => d.data().status === 'completed').length;
      setCompletedTasksCount(completedTasks);

      // 4. Fetch recent activities (and sort by timestamp desc)
      const activitiesSnapshot = await getDocs(collection(db, 'activities'));
      const sortedActs = activitiesSnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
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
    } catch (err) {
      console.error('Error fetching data from Firestore:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const seedDemoData = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      // Add sample projects
      const projects = [
        { name: 'Project Alpha', status: 'Active', site: 'Site A', manager: 'John Doe' },
        { name: 'Project Beta', status: 'Active', site: 'Site B', manager: 'Jane Smith' },
        { name: 'Project Gamma', status: 'Pending', site: 'Site C', manager: 'Mike Johnson' },
      ];
      for (const p of projects) {
        await addDoc(collection(db, 'projects'), p);
      }

      // Add sample alerts
      const alerts = [
        { title: 'Copper wiring running low', severity: 'high', status: 'pending' },
        { title: 'Safety inspection pending', severity: 'medium', status: 'pending' },
        { title: 'Delayed shipment - Concrete', severity: 'low', status: 'pending' },
      ];
      for (const a of alerts) {
        await addDoc(collection(db, 'alerts'), a);
      }

      // Add sample tasks (completed / pending)
      for (let i = 0; i < 84; i++) {
        await addDoc(collection(db, 'tasks'), { title: `Completed Task ${i + 1}`, status: 'completed' });
      }
      await addDoc(collection(db, 'tasks'), { title: 'Review structural design', status: 'pending' });

      // Add sample activities
      const activities = [
        { title: 'New equipment logged', desc: 'Added 4 generators to Site A', type: 'package', timestamp: Timestamp.now() },
        { title: 'Phase 2 Approved', desc: 'Project Alpha cleared for next stage', type: 'task', timestamp: new Timestamp(Timestamp.now().seconds - 3600, 0) },
        { title: 'Low Inventory Alert', desc: 'Copper wiring running low', type: 'alert', timestamp: new Timestamp(Timestamp.now().seconds - 10800, 0) },
        { title: 'System Update', desc: 'Routine maintenance completed', type: 'settings', timestamp: new Timestamp(Timestamp.now().seconds - 18000, 0) },
      ];
      for (const act of activities) {
        await addDoc(collection(db, 'activities'), act);
      }

      // Reload
      await fetchData();
    } catch (err) {
      console.error('Error seeding data:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const clearDatabase = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      const collections = ['projects', 'alerts', 'tasks', 'activities'];
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(doc(db, colName, docSnapshot.id));
        }
      }
      // Reload
      await fetchData();
    } catch (err) {
      console.error('Error clearing data:', err);
    } finally {
      setIsDbActionLoading(false);
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
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Admin User</p>
              <p className="text-xs text-slate-400 truncate">admin@apec.com</p>
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

        {/* Dashboard Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-7xl mx-auto space-y-6 lg:space-y-8 pb-10"
          >
            {/* Database Control Center */}
            <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Live Firestore Controls</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Manage database collections. Click seed to insert real sample data, or clear all data to test empty states.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={seedDemoData}
                  disabled={isLoading || isDbActionLoading}
                  className="flex-1 md:flex-none px-4 py-2.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Seed Demo Data'}
                </button>
                <button 
                  onClick={clearDatabase}
                  disabled={isLoading || isDbActionLoading}
                  className="flex-1 md:flex-none px-4 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Clear All Data'}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center justify-between group hover:bg-slate-900/80 transition-all hover:border-slate-700">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-slate-400 mb-1">{stat.title}</p>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-500 mt-1" />
                      ) : (
                        stat.value
                      )}
                    </h3>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner border border-white/5`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Main Area Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Chart/Activity Area */}
              <div className="xl:col-span-2 p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col min-h-[350px] lg:min-h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Project Analytics</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monthly workflow distribution</p>
                  </div>
                  <select className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500 shadow-inner hover:bg-slate-900 transition-colors cursor-pointer">
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                  </select>
                </div>
                
                {/* Dynamic Chart Area */}
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  </div>
                ) : activitiesList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <TrendingUp className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No project analytics available</p>
                    <p className="text-xs text-slate-600 mt-1">Use the Seeding button to populate stats</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-end gap-1.5 sm:gap-2 pb-6 pt-4 px-1 lg:px-4 h-full border-b border-slate-800/50 relative">
                    {/* Y-axis grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                      {[100, 75, 50, 25, 0].map(val => (
                         <div key={val} className="w-full border-t border-slate-800/30 flex items-center">
                           <span className="absolute -left-1 text-[9px] text-slate-600 -translate-y-1/2">{val}</span>
                         </div>
                      ))}
                    </div>

                    {/* Chart Bars */}
                    {[40, 70, 45, 90, 65, 85, 100, 50, 75, 60, 30, 80].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                        <div 
                          className="w-full bg-gradient-to-t from-red-900/40 to-red-500/40 group-hover:to-red-500/60 rounded-t-md transition-all relative shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border-x border-t border-red-500/20"
                          style={{ height: `${h}%` }}
                        >
                           <div className="absolute -top-1 left-0 right-0 h-1 bg-red-400 rounded-t-md opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_10px_rgba(248,113,113,0.5)] transition-all" />
                        </div>
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 uppercase font-mono">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Secondary List Area */}
              <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col min-h-[350px]">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  </div>
                ) : activitiesList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <Package className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No activity logs recorded</p>
                    <p className="text-xs text-slate-600 mt-1">Ready to sync live Firestore collections</p>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1 overflow-y-auto max-h-[350px] pr-1">
                    {activitiesList.map((item, i) => {
                      const iconData = getActivityIcon(item.type);
                      const Icon = iconData.icon;
                      return (
                        <div key={item.id || i} className="flex items-start gap-4 group cursor-pointer">
                          <div className={`w-10 h-10 rounded-full ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-4 h-4 ${iconData.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{item.title}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{item.desc}</p>
                            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <button 
                  onClick={fetchData} 
                  disabled={isLoading}
                  className="w-full mt-6 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 rounded-xl hover:border-slate-600 shadow-sm"
                >
                  Refresh Logs
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      </main>

    </div>
  );
}
