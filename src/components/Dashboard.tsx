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

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
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
    { title: 'Active Projects', value: '12', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Pending Alerts', value: '3', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Completed Tasks', value: '84', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Efficiency Rate', value: '94%', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-800/5 rounded-full blur-[150px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        className={`fixed lg:relative z-50 w-64 h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-700 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
               <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain p-0.5" onError={(e) => {
                 (e.currentTarget as HTMLImageElement).src = '/logo.png';
               }} />
             </div>
             <div>
               <h1 className="font-bold text-lg text-white leading-tight">APEC</h1>
               <p className="text-[9px] text-red-500 uppercase tracking-widest">ERP System</p>
             </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { setActiveTab(item.name); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-red-600/10 text-red-500 font-medium border border-red-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-slate-500'}`} />
                {item.name}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">admin@apec.com</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Header */}
        <header className="h-20 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-white">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 w-64 placeholder:text-slate-600 transition-all"
              />
            </div>
            <button className="relative p-2 rounded-full hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-slate-900"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto space-y-8"
          >
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm backdrop-blur-sm flex items-start justify-between group hover:border-slate-700 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Main Area Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart/Activity Area */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm backdrop-blur-sm min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Project Analytics</h3>
                  <select className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-1.5 text-slate-400 focus:outline-none focus:border-red-500">
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                  </select>
                </div>
                
                {/* Mock Chart Area */}
                <div className="flex-1 flex items-end gap-2 pb-4 pt-10 px-2">
                  {[40, 70, 45, 90, 65, 85, 100, 50, 75, 60, 30, 80].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group">
                      <div 
                        className="w-full bg-red-500/20 group-hover:bg-red-500/40 rounded-t-sm transition-all relative"
                        style={{ height: `${h}%` }}
                      >
                         <div className="absolute -top-1 left-0 right-0 h-1 bg-red-500 rounded-t-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary List Area */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                <div className="space-y-6">
                  {[
                    { text: 'New equipment logged at Site A', time: '2m ago', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { text: 'Project Alpha phase 2 approved', time: '1h ago', color: 'text-green-500', bg: 'bg-green-500/10' },
                    { text: 'Low inventory alert: Generators', time: '3h ago', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { text: 'System update scheduled', time: '5h ago', color: 'text-slate-400', bg: 'bg-slate-400/10' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className={`w-2 h-2 mt-2 rounded-full ${item.color} shadow-[0_0_8px_currentColor]`} />
                      <div>
                        <p className="text-sm text-slate-300">{item.text}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-8 py-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors border border-dashed border-slate-800 rounded-lg hover:border-red-500/30">
                  View All Activity
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      </main>

    </div>
  );
}
