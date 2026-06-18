import React, { useState, useEffect, useMemo } from 'react';
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
import { collection, onSnapshot, query, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Overview() {
  const { setFirestoreError, firestoreError, isAdmin } = useOutletContext<any>();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);

  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);



  // Reports Exporter logic
  const handleExport = (format: 'pdf' | 'csv') => {
    if (!isAdmin) return;
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
    activities: false,
    schedules: false
  });

  const isOverviewLoading = 
    !loadedCollections.projects || 
    !loadedCollections.alerts || 
    !loadedCollections.tasks || 
    !loadedCollections.activities ||
    !loadedCollections.schedules;

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
        activities: true,
        schedules: true
      });
      // Mock data for schedules if no DB
      setSchedulesList([
        { id: '1', date: new Date().toISOString().slice(0, 10), status: 'On Time' },
        { id: '2', date: new Date().toISOString().slice(0, 10), status: 'Delayed' },
        { id: '3', date: new Date().toISOString().slice(0, 10), status: 'Absent' }
      ]);
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
    const qActivities = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(15));
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

    // 5. Schedules listener
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const schs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchedulesList(schs);
      setLoadedCollections(prev => ({ ...prev, schedules: true }));
    }, (err) => {
      console.error('Schedules listener error:', err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, schedules: true }));
    });

    return () => {
      unsubProjects();
      unsubAlerts();
      unsubTasks();
      unsubActivities();
      unsubSchedules();
    };
  }, [setFirestoreError]);

  const computedStats = useMemo(() => {
    let onTime = 0;
    let delayed = 0;
    let absent = 0;
    
    schedulesList.forEach(s => {
      if (s.status === 'On Time') onTime++;
      else if (s.status === 'Delayed') delayed++;
      else if (s.status === 'Absent') absent++;
    });
    
    const checkedShifts = onTime + delayed + absent;
    const compliance = checkedShifts > 0 ? Math.round((onTime / checkedShifts) * 100) : 100;
    return { compliance };
  }, [schedulesList]);

  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const counts = Array(12).fill(0);
    
    schedulesList.forEach(s => {
      if (s.date) {
        const parts = s.date.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-indexed
          if (year === currentYear && month >= 0 && month < 12) {
            counts[month]++;
          }
        }
      }
    });

    const maxCount = Math.max(...counts, 1);
    const heights = counts.map(count => Math.round((count / maxCount) * 100));
    
    return { counts, heights };
  }, [schedulesList]);

  const stats = [
    { title: 'Active Projects', value: !loadedCollections.projects ? '...' : activeProjectsCount.toString(), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { title: 'Pending Alerts', value: !loadedCollections.alerts ? '...' : pendingAlertsCount.toString(), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { title: 'Completed Tasks', value: !loadedCollections.tasks ? '...' : completedTasksCount.toString(), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Attendance Compliance', value: !loadedCollections.schedules ? '...' : `${computedStats.compliance}%`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6 lg:space-y-8 pb-10 print:p-0"
    >
      {/* Overview Top Header & Report Exporter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] print:border-none print:shadow-none print:bg-transparent">
        <div>
          <h2 className="text-xl font-bold text-slate-100 print:text-slate-900">APEC Operations Terminal</h2>
          <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">Operational overview and analytics control dashboard</p>
        </div>
        {isAdmin && (
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
        )}
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
                {monthlyData.heights.map((h, i) => {
                  const count = monthlyData.counts[i];
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 font-mono shadow-md">
                        {count} {count === 1 ? 'Dispatch' : 'Dispatches'}
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500 group-hover:from-cyan-500/40 group-hover:to-cyan-400 rounded-t-lg transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative border border-white/10 print:bg-slate-300 print:border-slate-400 print:shadow-none cursor-pointer"
                        style={{ height: `${Math.max(h, 2)}%` }}
                      >
                      </div>
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 uppercase font-mono print:text-slate-700">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                    </div>
                  );
                })}
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
    </motion.div>
  );
}
