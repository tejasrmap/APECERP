import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Package, 
  Settings,
  Loader2,
  Download,
  FileText
} from 'lucide-react';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Overview() {
  const { setFirestoreError, firestoreError } = useOutletContext<any>();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);

  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);

  // IoT Telemetry State
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [telemetry, setTelemetry] = useState({
    voltage: 415.2,
    current: 124.8,
    frequency: 50.02,
    solarOutput: 45.6,
    batteryTemp: 28.4,
    gridEfficiency: 94.2
  });

  useEffect(() => {
    if (isManualOverride) return;
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        voltage: parseFloat((415 + Math.random() * 3).toFixed(1)),
        current: parseFloat((120 + Math.random() * 10).toFixed(1)),
        frequency: parseFloat((50 + Math.random() * 0.1 - 0.05).toFixed(2)),
        solarOutput: parseFloat((40 + Math.random() * 12).toFixed(1)),
        batteryTemp: parseFloat((27 + Math.random() * 3).toFixed(1)),
        gridEfficiency: parseFloat((93 + Math.random() * 2).toFixed(1))
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, [isManualOverride]);

  // Reports Exporter logic
  const handleExport = (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Type,Name/Title,Detail,Status\n";
      
      // Projects
      projectsList.forEach(p => {
        csvContent += `Project,"${p.name}","Site: ${p.site} | Manager: ${p.manager}",${p.status}\n`;
      });
      
      // Tasks
      tasksList.forEach(t => {
        csvContent += `Task,"${t.title}","${t.desc || ''}",${t.status}\n`;
      });
      
      // Activities
      activitiesList.forEach(a => {
        csvContent += `Activity,"${a.title}","${a.desc}",${a.time}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `APEC_Operations_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF print view trigger
      window.print();
    }
  };
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  const [loadedCollections, setLoadedCollections] = useState<{ [key: string]: boolean }>({
    projects: false,
    alerts: false,
    tasks: false,
    activities: false
  });

  const isOverviewLoading = 
    !loadedCollections.projects || 
    !loadedCollections.alerts || 
    !loadedCollections.tasks || 
    !loadedCollections.activities;

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadedCollections(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(key => {
          if (!updated[key]) {
            updated[key] = true;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Listeners
  useEffect(() => {
    if (!db) {
      setLoadedCollections({
        projects: true,
        alerts: true,
        tasks: true,
        activities: true
      });
      return;
    }

    // 1. Projects listener
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(projs);
      setActiveProjectsCount(projs.filter((p: any) => p.status === 'Active').length);
      setLoadedCollections(prev => ({ ...prev, projects: true }));
    }, (err) => {
      console.error('Projects listener error:', err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, projects: true }));
    });

    // 2. Alerts listener
    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (snapshot) => {
      const alts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlertsList(alts);
      setPendingAlertsCount(alts.filter((a: any) => a.status === 'pending').length);
      setLoadedCollections(prev => ({ ...prev, alerts: true }));
    }, (err) => {
      console.error('Alerts listener error:', err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, alerts: true }));
    });

    // 3. Tasks listener
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasksList(tks);
      setCompletedTasksCount(tks.filter((t: any) => t.status === 'completed').length);
      setLoadedCollections(prev => ({ ...prev, tasks: true }));
    }, (err) => {
      console.error('Tasks listener error:', err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, tasks: true }));
    });

    // 4. Activities listener
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
      setLoadedCollections(prev => ({ ...prev, activities: true }));
    }, (err) => {
      console.error('Activities listener error:', err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, activities: true }));
    });

    return () => {
      unsubProjects();
      unsubAlerts();
      unsubTasks();
      unsubActivities();
    };
  }, [setFirestoreError]);

  const stats = [
    { title: 'Active Projects', value: !loadedCollections.projects ? '...' : activeProjectsCount.toString(), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { title: 'Pending Alerts', value: !loadedCollections.alerts ? '...' : pendingAlertsCount.toString(), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { title: 'Completed Tasks', value: !loadedCollections.tasks ? '...' : completedTasksCount.toString(), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Efficiency Rate', value: '94%', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'package':
        return { icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
      case 'task':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'alert':
        return { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
      case 'settings':
      default:
        return { icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    }
  };

  if (isOverviewLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a13]/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 lg:space-y-8 pb-10 print:p-0"
    >
      {/* Overview Top Header & Report Exporter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] print:border-none print:shadow-none print:bg-transparent">
        <div>
          <h2 className="text-xl font-bold text-slate-100 print:text-slate-900">APEC Operations Terminal</h2>
          <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">Operational overview and analytics control dashboard</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto print:hidden">
          <button 
            onClick={() => handleExport('csv')}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Generate PDF Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 print:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-5 lg:p-6 rounded-2xl glass-card flex items-center justify-between group hover:border-white/15 hover:-translate-y-0.5 transition-all duration-300 print:border-slate-200 print:bg-slate-50 print:text-slate-900">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-400 mb-1 print:text-slate-500">{stat.title}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight print:text-slate-900">{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm print:bg-slate-100 print:border-slate-200`}>
              <stat.icon className={`w-6 h-6 ${stat.color} print:text-slate-700`} />
            </div>
          </div>
        ))}
      </div>

      {/* Split layouts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:grid-cols-3">
        {/* Chart */}
        <div className="xl:col-span-2 p-5 lg:p-6 rounded-2xl glass-card flex flex-col min-h-[350px] lg:min-h-[400px] print:border-slate-200 print:bg-slate-50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-100 print:text-slate-900">Project Analytics</h3>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">Monthly workflow distribution</p>
            </div>
          </div>
          {projectsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-400">No project data to analyze</p>
              <p className="text-xs text-slate-500 mt-1">Please populate database in Settings or Projects tab.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-2 print:overflow-visible">
              <div className="flex items-end gap-1.5 sm:gap-2 pb-6 pt-4 px-1 lg:px-4 h-full min-w-[480px] sm:min-w-0 border-b border-slate-800 relative print:border-slate-200 print:min-w-0">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  {[100, 75, 50, 25, 0].map(val => (
                     <div key={val} className="w-full border-t border-slate-800/40 print:border-slate-200/50 flex items-center" />
                  ))}
                </div>
                {[40, 70, 45, 90, 65, 85, 100, 50, 75, 60, 30, 80].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                    <div 
                      className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500 group-hover:from-cyan-500/40 group-hover:to-cyan-405 rounded-t-lg transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative border border-white/10 print:bg-slate-300 print:border-slate-400 print:shadow-none"
                      style={{ height: `${h}%` }}
                    >
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 uppercase font-mono print:text-slate-700">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-5 lg:p-6 rounded-2xl glass-card flex flex-col min-h-[350px] print:border-slate-200 print:bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-100 print:text-slate-900 mb-6">Recent Activity</h3>
          {activitiesList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-400">No logs found</p>
              <p className="text-xs text-slate-500 mt-1">Actions on database will be logged here.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin print:max-h-none print:overflow-visible">
              {activitiesList.slice(0, 5).map((item, i) => {
                const iconData = getActivityIcon(item.type);
                const Icon = iconData.icon;
                return (
                  <div key={item.id || i} className="flex items-start gap-4 group print:text-slate-900">
                    <div className={`w-10 h-10 rounded-full ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0 shadow-sm print:bg-slate-100 print:border-slate-200`}>
                      <Icon className={`w-4 h-4 ${iconData.color} print:text-slate-700`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-50 truncate transition-colors print:text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5 print:text-slate-600">{item.desc}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-slate-500">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* IoT Telemetry Grid */}
      <div className="p-5 lg:p-6 rounded-2xl glass-card relative overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] print:border-slate-200 print:bg-slate-50">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none print:hidden" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 print:text-slate-900">
              <span className={`w-2 h-2 rounded-full ${isManualOverride ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'} print:hidden`} />
              Live Telemetry Grid (APEC Power Assets)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">Real-time substation and inverter performance metrics</p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
              <input 
                type="checkbox"
                checked={isManualOverride}
                onChange={(e) => setIsManualOverride(e.target.checked)}
                className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 text-cyan-500 focus:ring-cyan-500/20 rounded cursor-pointer"
              />
              Manual Sliders
            </label>
            <span className={`text-[10px] ${isManualOverride ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'} border px-2.5 py-0.5 rounded-md font-mono uppercase tracking-wider`}>
              {isManualOverride ? 'Overrides' : 'Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-3">
          {[
            { key: 'voltage', label: 'Substation Voltage', value: `${telemetry.voltage} V`, min: 380, max: 450, step: 0.1, change: 'Normal Range', color: 'text-cyan-400' },
            { key: 'current', label: 'Substation Load', value: `${telemetry.current} A`, min: 50, max: 250, step: 0.1, change: 'Optimal Peak', color: 'text-amber-400' },
            { key: 'frequency', label: 'Grid Frequency', value: `${telemetry.frequency} Hz`, min: 48, max: 52, step: 0.01, change: 'Stable', color: 'text-emerald-400' },
            { key: 'solarOutput', label: 'Solar Output', value: `${telemetry.solarOutput} kW`, min: 0, max: 100, step: 0.1, change: 'Peak Sun', color: 'text-yellow-400' },
            { key: 'batteryTemp', label: 'Battery Core Temp', value: `${telemetry.batteryTemp} °C`, min: 15, max: 80, step: 0.1, change: 'Nominal', color: 'text-teal-400' },
            { key: 'gridEfficiency', label: 'Inverter Efficiency', value: `${telemetry.gridEfficiency} %`, min: 80, max: 100, step: 0.1, change: '+0.4% Dev', color: 'text-cyan-400' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-950/45 rounded-xl border border-slate-900/60 flex flex-col justify-between hover:border-slate-800 transition-colors print:border-slate-200 print:bg-white min-h-[125px]">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">{item.label}</span>
                <span className={`text-xl font-bold my-1 tracking-tight block ${item.color} print:text-slate-900`}>{item.value}</span>
              </div>
              
              {isManualOverride ? (
                <div className="mt-2 space-y-1 print:hidden">
                  <input 
                    type="range" 
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={(telemetry as any)[item.key]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTelemetry(prev => ({ ...prev, [item.key]: val }));
                    }}
                    className="w-full accent-cyan-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                    <span>{item.min}</span>
                    <span>{item.max}</span>
                  </div>
                </div>
              ) : (
                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 print:text-slate-550 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500/50" />
                  {item.change}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}
