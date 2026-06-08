import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Package, 
  Settings,
  Loader2
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
    { title: 'Active Projects', value: !loadedCollections.projects ? '...' : activeProjectsCount.toString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-200/40' },
    { title: 'Pending Alerts', value: !loadedCollections.alerts ? '...' : pendingAlertsCount.toString(), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-200/40' },
    { title: 'Completed Tasks', value: !loadedCollections.tasks ? '...' : completedTasksCount.toString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-200/40' },
    { title: 'Efficiency Rate', value: '94%', icon: TrendingUp, color: 'text-[#0e2a47]', bg: 'bg-[#0e2a47]/10', border: 'border-[#0e2a47]/20' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'package':
        return { icon: Package, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'task':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'alert':
        return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      case 'settings':
      default:
        return { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    }
  };

  if (isOverviewLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 lg:space-y-8 pb-10"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-5 lg:p-6 rounded-2xl glass-card border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.03)] flex items-center justify-between group hover:shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:border-white/95 hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-550 mb-1">{stat.title}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Split layouts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 p-5 lg:p-6 rounded-2xl glass-card border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.03)] flex flex-col min-h-[350px] lg:min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Project Analytics</h3>
              <p className="text-xs text-slate-505 mt-0.5">Monthly workflow distribution</p>
            </div>
          </div>
          {projectsList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No project data to analyze</p>
              <p className="text-xs text-slate-400 mt-1">Please populate database in Settings or Projects tab.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-2">
              <div className="flex items-end gap-1.5 sm:gap-2 pb-6 pt-4 px-1 lg:px-4 h-full min-w-[480px] sm:min-w-0 border-b border-slate-150 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  {[100, 75, 50, 25, 0].map(val => (
                     <div key={val} className="w-full border-t border-slate-100/80 flex items-center" />
                  ))}
                </div>
                {[40, 70, 45, 90, 65, 85, 100, 50, 75, 60, 30, 80].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end group h-full relative z-10">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500/40 to-[#0e2a47] group-hover:from-blue-500/60 group-hover:to-[#13385d] rounded-t-lg transition-all duration-300 shadow-[0_4px_12px_rgba(14,42,71,0.08)] relative border border-white/10"
                      style={{ height: `${h}%` }}
                    >
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-450 uppercase font-mono">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-5 lg:p-6 rounded-2xl glass-card border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.03)] flex flex-col min-h-[350px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
          {activitiesList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No logs found</p>
              <p className="text-xs text-slate-400 mt-1">Actions on database will be logged here.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
              {activitiesList.slice(0, 5).map((item, i) => {
                const iconData = getActivityIcon(item.type);
                const Icon = iconData.icon;
                return (
                  <div key={item.id || i} className="flex items-start gap-4 group">
                    <div className={`w-10 h-10 rounded-full ${iconData.bg} border ${iconData.border} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className={`w-4 h-4 ${iconData.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 truncate transition-colors">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.desc}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">{item.time}</p>
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
