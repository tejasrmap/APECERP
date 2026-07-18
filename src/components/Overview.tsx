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
  FileText,
  Briefcase,
  Users,
  CalendarRange,
  Coins
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
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [leavesList, setLeavesList] = useState<any[]>([]);

  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

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

  const [loadedCollections, setLoadedCollections] = useState<{ [key: string]: boolean }>({
    projects: false,
    alerts: false,
    tasks: false,
    activities: false,
    schedules: false,
    leads: false,
    attendance: false,
    leaves: false
  });

  const isOverviewLoading = 
    !loadedCollections.projects || 
    !loadedCollections.alerts || 
    !loadedCollections.tasks || 
    !loadedCollections.activities ||
    !loadedCollections.schedules ||
    !loadedCollections.leads ||
    !loadedCollections.attendance ||
    !loadedCollections.leaves;

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
      setLoadedCollections(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = true; });
        return next;
      });
      return;
    }

    const unsubscribes: (() => void)[] = [];

    const handleSnapshotError = (err: any, collectionName: string) => {
      console.error(`${collectionName} listener error:`, err);
      setFirestoreError(err.code);
      setLoadedCollections(prev => ({ ...prev, [collectionName]: true }));
    };

    // 1. Projects listener
    unsubscribes.push(onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjectsList(projs);
      setActiveProjectsCount(projs.filter((p: any) => p.status === 'Active').length);
      setLoadedCollections(prev => ({ ...prev, projects: true }));
    }, (err) => handleSnapshotError(err, 'projects')));

    // 2. Alerts listener
    unsubscribes.push(onSnapshot(collection(db, 'alerts'), (snapshot) => {
      const alts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlertsList(alts);
      setPendingAlertsCount(alts.filter((a: any) => a.status === 'pending').length);
      setLoadedCollections(prev => ({ ...prev, alerts: true }));
    }, (err) => handleSnapshotError(err, 'alerts')));

    // 3. Tasks listener
    unsubscribes.push(onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasksList(tks);
      setCompletedTasksCount(tks.filter((t: any) => t.status === 'completed').length);
      setLoadedCollections(prev => ({ ...prev, tasks: true }));
    }, (err) => handleSnapshotError(err, 'tasks')));

    // 4. Activities listener
    const qActivities = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(15));
    unsubscribes.push(onSnapshot(qActivities, (snapshot) => {
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
    }, (err) => handleSnapshotError(err, 'activities')));

    // 5. Schedules listener
    unsubscribes.push(onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const schs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchedulesList(schs);
      setLoadedCollections(prev => ({ ...prev, schedules: true }));
    }, (err) => handleSnapshotError(err, 'schedules')));

    // 6. Leads listener
    unsubscribes.push(onSnapshot(collection(db, 'leads'), (snapshot) => {
      const leads = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeadsList(leads);
      setLoadedCollections(prev => ({ ...prev, leads: true }));
    }, (err) => handleSnapshotError(err, 'leads')));

    // 7. Attendance listener
    unsubscribes.push(onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendanceList(logs);
      setLoadedCollections(prev => ({ ...prev, attendance: true }));
    }, (err) => handleSnapshotError(err, 'attendance')));

    // 8. Leaves listener
    unsubscribes.push(onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const leaves = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeavesList(leaves);
      setLoadedCollections(prev => ({ ...prev, leaves: true }));
    }, (err) => handleSnapshotError(err, 'leaves')));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [setFirestoreError]);

  // Compute Stats
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

    // Leads & Pipeline
    let pipelineValue = 0;
    leadsList.forEach(l => {
      if (l.status !== 'Lost' && l.value) {
        pipelineValue += Number(l.value);
      }
    });

    // Format pipeline value in Indian Lakhs/Crores format cleanly
    let formattedPipeline = `₹${pipelineValue.toLocaleString('en-IN')}`;
    if (pipelineValue >= 10000000) {
      formattedPipeline = `₹${(pipelineValue / 10000000).toFixed(2)} Cr`;
    } else if (pipelineValue >= 100000) {
      formattedPipeline = `₹${(pipelineValue / 100000).toFixed(2)} L`;
    }

    // Attendance (Today's Active Users)
    const todayStr = new Date().toDateString();
    const activeTechIds = new Set();
    attendanceList.forEach(log => {
      const logDate = new Date(log.timestamp).toDateString();
      if (logDate === todayStr && log.type === 'punch_in') {
        // We assume they are active if they punched in today (to be exact we should check for punch out, but this is a good estimate)
        activeTechIds.add(log.employeeId || log.userEmail);
      }
    });
    // Remove those who punched out later today
    attendanceList.forEach(log => {
      const logDate = new Date(log.timestamp).toDateString();
      if (logDate === todayStr && log.type === 'punch_out') {
        activeTechIds.delete(log.employeeId || log.userEmail);
      }
    });

    // Leaves Today
    let leavesToday = 0;
    const todayISODate = new Date().toISOString().slice(0, 10);
    leavesList.forEach(l => {
      if (l.status === 'Approved' && l.startDate <= todayISODate && l.endDate >= todayISODate) {
        leavesToday++;
      }
    });

    return { 
      compliance, 
      pipelineValue: formattedPipeline, 
      activeTeam: activeTechIds.size,
      leavesToday,
      totalLeads: leadsList.length
    };
  }, [schedulesList, leadsList, attendanceList, leavesList]);

  const dailyData = useMemo(() => {
    const dates: string[] = [];
    const counts = Array(7).fill(0);
    const labels: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    schedulesList.forEach(s => {
      if (s.date) {
        const idx = dates.indexOf(s.date);
        if (idx !== -1) {
          counts[idx]++;
        }
      }
    });

    const maxCount = Math.max(...counts, 1);
    const heights = counts.map(count => Math.round((count / maxCount) * 100));
    
    return { counts, heights, labels };
  }, [schedulesList]);

  const stats = [
    { title: 'Active Projects', value: !loadedCollections.projects ? '...' : activeProjectsCount.toString(), icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { title: 'Pipeline Value', value: !loadedCollections.leads ? '...' : computedStats.pipelineValue, icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Active Team', value: !loadedCollections.attendance ? '...' : computedStats.activeTeam.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { title: 'Total Leads', value: !loadedCollections.leads ? '...' : computedStats.totalLeads.toString(), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { title: 'On Leave Today', value: !loadedCollections.leaves ? '...' : computedStats.leavesToday.toString(), icon: CalendarRange, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { title: 'Pending Alerts', value: !loadedCollections.alerts ? '...' : pendingAlertsCount.toString(), icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { title: 'Completed Tasks', value: !loadedCollections.tasks ? '...' : completedTasksCount.toString(), icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { title: 'Sched. Compliance', value: !loadedCollections.schedules ? '...' : `${computedStats.compliance}%`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 lg:space-y-8 pb-10 print:p-0"
    >
      {/* Overview Top Header & Report Exporter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 lg:p-7 rounded-[2rem] glass-card border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] print:border-none print:shadow-none print:bg-transparent overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white print:text-slate-900 tracking-tight">APEC Operations Center</h2>
          <p className="text-sm text-slate-400 mt-1 print:text-slate-600">Real-time operational overview and enterprise analytics • Made by <span className="font-bold text-cyan-400 print:text-slate-900">GT INNOX LLP</span></p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-3 self-stretch sm:self-auto print:hidden relative z-10">
            <button 
              onClick={() => handleExport('csv')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 text-xs font-bold transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.25)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate PDF Report
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid - Upgraded to 8 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 print:grid-cols-4">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="p-5 lg:p-6 rounded-[2rem] glass-card flex flex-col justify-between group hover:bg-slate-900/40 hover:border-white/10 transition-all duration-300 relative overflow-hidden print:border-slate-200 print:bg-slate-50 print:text-slate-900 h-36"
          >
            {/* Ambient card glow based on stat color */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.bg} rounded-full blur-[30px] opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none`} />
            
            <div className="flex justify-between items-start z-10 relative">
              <div className={`w-11 h-11 rounded-2xl ${stat.bg} ${stat.border} border flex items-center justify-center shadow-sm print:bg-slate-100 print:border-slate-200`}>
                <stat.icon className={`w-5 h-5 ${stat.color} print:text-slate-700`} />
              </div>
            </div>
            
            <div className="z-10 relative mt-3">
              <h3 className="text-2xl font-bold text-white tracking-tight print:text-slate-900">{stat.value}</h3>
              <p className="text-[11px] lg:text-xs font-medium text-slate-400 mt-1 print:text-slate-500 truncate">{stat.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Split layouts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:grid-cols-3">
        {/* Chart */}
        <div className="xl:col-span-2 p-5 lg:p-7 rounded-[2rem] glass-card flex flex-col min-h-[350px] lg:min-h-[420px] relative overflow-hidden print:border-slate-200 print:bg-slate-50">
          {/* Subtle grid background */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(var(--tw-colors-slate-100) 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }} 
          />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white print:text-slate-900">Project Analytics</h3>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-500">Daily workflow dispatch distribution (Last 7 Days)</p>
            </div>
          </div>
          
          {projectsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
              <div className="w-16 h-16 rounded-full bg-slate-900/50 border border-slate-800 flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No project data to analyze</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Please populate the database in Settings or the Projects tab to generate analytics.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-2 print:overflow-visible relative z-10">
              <div className="flex items-end gap-2 lg:gap-4 pb-8 pt-6 px-2 lg:px-4 h-full min-w-[480px] sm:min-w-0 border-b border-slate-800 relative print:border-slate-200 print:min-w-0">
                {/* Horizontal reference lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                  {[100, 75, 50, 25, 0].map(val => (
                     <div key={val} className="w-full border-t border-slate-800/30 print:border-slate-200/50 flex items-center" />
                  ))}
                </div>
                
                {/* Bars */}
                {dailyData.heights.map((h, i) => {
                  const count = dailyData.counts[i];
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                      {/* Premium Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-2 transform group-hover:-translate-y-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span className="font-bold">{count}</span> Dispatches
                      </div>
                      
                      {/* Bar body */}
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-500/10 via-cyan-500/40 to-cyan-400 group-hover:from-cyan-500/20 group-hover:via-cyan-400/60 group-hover:to-cyan-300 rounded-t-xl transition-all duration-300 relative print:bg-slate-300 print:border-slate-400 print:shadow-none cursor-pointer"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      >
                        {/* Top highlight */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-t-xl"></div>
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] pointer-events-none"></div>
                      </div>
                      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-medium print:text-slate-700 whitespace-nowrap">{dailyData.labels[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-5 lg:p-7 rounded-[2rem] glass-card flex flex-col min-h-[350px] print:border-slate-200 print:bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
          
          <h3 className="text-lg font-bold text-white print:text-slate-900 mb-6">Activity Feed</h3>
          
          {activitiesList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No logs found</p>
              <p className="text-xs text-slate-500 mt-1">Actions on database will be logged here.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-2 scrollbar-thin print:max-h-none print:overflow-visible">
              {activitiesList.slice(0, 6).map((item, i) => {
                const iconData = getActivityIcon(item.type);
                const Icon = iconData.icon;
                return (
                  <div key={item.id || i} className="flex items-start gap-4 group print:text-slate-900 p-2 rounded-2xl hover:bg-slate-900/40 transition-colors">
                    <div className={`w-10 h-10 rounded-2xl ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0 shadow-sm print:bg-slate-100 print:border-slate-200 transition-transform group-hover:scale-110`}>
                      <Icon className={`w-4 h-4 ${iconData.color} print:text-slate-700`} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate transition-colors print:text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium print:text-slate-500 shrink-0 mt-0.5">{item.time}</p>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 print:text-slate-600">{item.desc}</p>
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
