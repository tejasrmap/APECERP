import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Loader2, 
  Search,
  User,
  AlertCircle,
  FileText
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db, auth } from '../firebase';

export default function Leaves() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile } = useOutletContext<any>();

  const activeEmail = userProfile?.email || auth?.currentUser?.email || '';
  const isUserAdmin = isAdmin || 
    activeEmail.toLowerCase() === 'admin@apecpowersolutions.com' || 
    activeEmail.toLowerCase() === 'managingdirector@apecpowersolutions.com';

  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [isLeavesLoading, setIsLeavesLoading] = useState(true);

  // Form States
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');

  // Load leaves data
  useEffect(() => {
    if (!db) {
      // Offline mock data
      const mockLeaves = [
        {
          id: '1',
          employeeId: userProfile?.id || 'tech-1',
          employeeName: userProfile?.name || 'Rahul Sharma',
          employeeEmail: activeEmail || 'rahul@apecpowersolutions.com',
          leaveType: 'Sick',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          reason: 'Fever and cold',
          status: 'Approved',
          timestamp: Timestamp.now()
        },
        {
          id: '2',
          employeeId: 'tech-2',
          employeeName: 'Sanjay Kumar',
          employeeEmail: 'sanjay@apecpowersolutions.com',
          leaveType: 'Casual',
          startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
          reason: 'Personal family matter',
          status: 'Pending',
          timestamp: Timestamp.now()
        }
      ];
      setLeavesList(mockLeaves);
      setIsLeavesLoading(false);
      return;
    }

    // Admins see all leaves, regular users only see their own
    const leavesRef = collection(db, 'leaves');
    let q = query(leavesRef);

    if (!isUserAdmin && activeEmail) {
      q = query(leavesRef, where('employeeEmail', '==', activeEmail));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp
        };
      });
      // Sort desc client-side to avoid Firestore composite index requirement
      list.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setLeavesList(list);
      setIsLeavesLoading(false);
    }, (err) => {
      console.error('Leaves listener error:', err);
      setFirestoreError(err.code);
      setIsLeavesLoading(false);
    });

    return () => unsub();
  }, [activeEmail, isUserAdmin, setFirestoreError, userProfile]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!startDate || !endDate || !reason) {
      setFormError('Please fill in all fields.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    setIsDbActionLoading(true);
    try {
      const empId = userProfile?.employeeId || 'APEC-MEMBER';
      const empName = userProfile?.name || auth?.currentUser?.displayName || 'APEC Employee';

      const payload = {
        employeeId: userProfile?.id || auth?.currentUser?.uid || 'unknown',
        employeeName: empName,
        employeeEmail: activeEmail,
        employeeCode: empId,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'Pending',
        timestamp: Timestamp.now()
      };

      if (db) {
        await addDoc(collection(db, 'leaves'), payload);
        
        // Register activity
        await addDoc(collection(db, 'activities'), {
          title: `New Leave Request`,
          desc: `${empName} applied for ${leaveType} leave from ${startDate} to ${endDate}`,
          type: 'settings',
          timestamp: Timestamp.now()
        });
      } else {
        // Mock offline fallback
        const newLeave = {
          id: `local-${Date.now()}`,
          ...payload
        };
        setLeavesList(prev => [newLeave, ...prev]);
      }

      setStartDate('');
      setEndDate('');
      setReason('');
      setFormSuccess(true);
      setIsApplying(false);
      
      setTimeout(() => {
        setFormSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error applying for leave:', err);
      setFormError('Failed to submit leave application. Please try again.');
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleUpdateStatus = async (leaveId: string, newStatus: 'Approved' | 'Rejected') => {
    if (!db || !isUserAdmin) return;
    setIsDbActionLoading(true);
    try {
      const leave = leavesList.find(l => l.id === leaveId);
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: newStatus
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: `Leave request ${newStatus.toLowerCase()}`,
        desc: `Leave application for ${leave?.employeeName || 'Employee'} has been ${newStatus.toLowerCase()}`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Filter leaves
  const filteredLeaves = React.useMemo(() => {
    return leavesList.filter(leave => {
      const term = searchTerm.toLowerCase();
      const nameMatch = leave.employeeName?.toLowerCase().includes(term) || false;
      const reasonMatch = leave.reason?.toLowerCase().includes(term) || false;
      const typeMatch = leave.leaveType?.toLowerCase().includes(term) || false;
      const searchMatch = nameMatch || reasonMatch || typeMatch;

      const statusMatch = statusFilter === 'all' || leave.status === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [leavesList, searchTerm, statusFilter]);

  // Statistics
  const stats = React.useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr);

    const pending = leavesList.filter(l => l.status === 'Pending').length;
    const approved = leavesList.filter(l => l.status === 'Approved').length;
    
    // Active leaves today
    const activeToday = leavesList.filter(l => {
      if (l.status !== 'Approved') return false;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return today >= start && today <= end;
    }).length;

    return { pending, approved, activeToday };
  }, [leavesList]);

  if (isLeavesLoading) {
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
      className="space-y-6 lg:space-y-8"
    >
      {/* Header section */}
      <div className="flex justify-between items-center p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Leaves Management Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isUserAdmin 
              ? 'Review and manage site technician leaves and attendance scheduling exceptions' 
              : 'Submit leave applications and monitor approval status history'
            }
          </p>
        </div>
        {!isUserAdmin && (
          <button 
            onClick={() => setIsApplying(!isApplying)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
          >
            {isApplying ? 'View Requests' : <Plus className="w-3.5 h-3.5" />}
            {isApplying ? 'Leave History' : 'Apply for Leave'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl glass-card border border-white/10 flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-450 tracking-wider font-semibold">Pending Requests</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-0.5">{stats.pending}</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-white/10 flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-450 tracking-wider font-semibold">Active Leaves Today</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-0.5">{stats.activeToday}</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-white/10 flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-450 tracking-wider font-semibold">Approved Requests</p>
            <h3 className="text-2xl font-extrabold text-slate-100 mt-0.5">{stats.approved}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <AnimatePresence mode="wait">
        {isApplying ? (
          <motion.div 
            key="leave-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] mx-auto w-full"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4">New Leave Application</h4>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <option value="Casual" className="bg-slate-900 text-slate-100">Casual Leave</option>
                    <option value="Sick" className="bg-slate-900 text-slate-100">Sick Leave</option>
                    <option value="Vacation" className="bg-slate-900 text-slate-100">Vacation Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Leave</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details about leave justification..."
                  required
                  rows={4}
                  className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm resize-none shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isDbActionLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Application'}
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Filter Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-950/20 p-4 rounded-xl border border-white/5">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isUserAdmin ? "Search employee name, reason, or type..." : "Search reason, type..."}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-500 text-slate-100 placeholder:text-slate-500 transition-all"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Leaves</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>
              </div>
            </div>

            {/* Leaves List */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              {filteredLeaves.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <FileText className="w-14 h-14 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No leave requests found</p>
                  <p className="text-xs text-slate-500 mt-1">Leaves logs matching filters will display here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/45 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        {isUserAdmin && <th className="p-4">Employee</th>}
                        <th className="p-4">Leave Type</th>
                        <th className="p-4">Duration</th>
                        <th className="p-4 hidden md:table-cell">Reason</th>
                        <th className="p-4">Status</th>
                        {isUserAdmin && <th className="p-4 text-center">Action Review</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                      {filteredLeaves.map((leave) => {
                        const isPending = leave.status === 'Pending';
                        return (
                          <tr key={leave.id} className="hover:bg-slate-900/30 transition-colors">
                            {isUserAdmin && (
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                                    {leave.employeeName?.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-100 text-xs truncate">{leave.employeeName}</p>
                                    <p className="text-[9px] text-slate-550 font-mono leading-none tracking-wide">{leave.employeeCode || 'APEC-MEMBER'}</p>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="p-4">
                              <span className="font-bold text-slate-150">{leave.leaveType}</span>
                            </td>
                            <td className="p-4 font-medium font-mono text-xs">
                              <div>{leave.startDate}</div>
                              <div className="text-[9.5px] text-slate-500">to {leave.endDate}</div>
                            </td>
                            <td className="p-4 hidden md:table-cell text-xs max-w-xs truncate" title={leave.reason}>
                              {leave.reason}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                leave.status === 'Approved' ? 'bg-green-955/40 text-green-400 border-green-500/25' :
                                leave.status === 'Rejected' ? 'bg-rose-955/40 text-rose-455 border-rose-500/25' :
                                'bg-amber-955/40 text-amber-400 border-amber-500/25'
                              }`}>
                                {leave.status}
                              </span>
                            </td>
                            {isUserAdmin && (
                              <td className="p-4 text-center">
                                {isPending ? (
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                                      className="p-1 px-2.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-955 text-[10px] font-bold transition-all"
                                      disabled={isDbActionLoading}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                                      className="p-1 px-2.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-bold transition-all"
                                      disabled={isDbActionLoading}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-semibold font-mono">Reviewed</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Toast Alert Success popup */}
      <AnimatePresence>
        {formSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-100">Application Registered</p>
              <p className="text-[10.5px] text-slate-350">Your leave request was submitted successfully for audit review.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
