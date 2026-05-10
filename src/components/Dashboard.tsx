import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Projects', icon: Activity },
    { name: 'Inventory', icon: Package },
    { name: 'Team', icon: Users },
    { name: 'Settings', icon: Settings },
  ];

  const stats = [
    { title: 'Active Projects', value: '12', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { title: 'Pending Alerts', value: '3', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { title: 'Completed Tasks', value: '84', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
    { title: 'Efficiency Rate', value: '94%', icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-500/20' },
  ];

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
                
                {/* Enhanced Mock Chart Area */}
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
              </div>

              {/* Secondary List Area */}
              <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                
                <div className="space-y-6 flex-1">
                  {[
                    { title: 'New equipment logged', desc: 'Added 4 generators to Site A', time: '2m ago', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
                    { title: 'Phase 2 Approved', desc: 'Project Alpha cleared for next stage', time: '1h ago', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
                    { title: 'Low Inventory Alert', desc: 'Copper wiring running low', time: '3h ago', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
                    { title: 'System Update', desc: 'Routine maintenance completed', time: '5h ago', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 group cursor-pointer">
                      <div className={`w-10 h-10 rounded-full ${item.bg} border ${item.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.desc}</p>
                        <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 rounded-xl hover:border-slate-600 shadow-sm">
                  View All Logs
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      </main>

    </div>
  );
}
