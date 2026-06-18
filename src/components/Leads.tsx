import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  PlusCircle, 
  Trash2, 
  Search, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Filter, 
  Edit,
  AlertCircle,
  IndianRupee,
  Check,
  X
} from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useOutletContext } from 'react-router-dom';

interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  description: string;
  dealValue: number;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
  notes: string;
  createdBy: string;
  createdByEmail: string;
  employeeId: string;
  timestamp: Date;
}

export default function Leads() {
  const { isAdmin, userProfile } = useOutletContext<any>();
  const [activeTab, setActiveTab] = useState<'submit' | 'my-leads' | 'all-leads'>(isAdmin ? 'all-leads' : 'submit');
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Leads Data States
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');

  // Edit State
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Lead['status']>('New');
  const [editNotes, setEditNotes] = useState('');

  const currentUserEmail = userProfile?.email?.toLowerCase() || '';

  // 1. Fetch User's Submitted Leads
  useEffect(() => {
    if (!db || !currentUserEmail) return;

    const q = query(
      collection(db, 'leads'),
      where('createdByEmail', '==', currentUserEmail)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let ts = new Date();
        if (data.timestamp) {
          if (data.timestamp.toDate) ts = data.timestamp.toDate();
          else if (data.timestamp.seconds) ts = new Date(data.timestamp.seconds * 1000);
        }
        return {
          id: doc.id,
          ...data,
          timestamp: ts
        } as Lead;
      });
      list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setMyLeads(list);
      if (!isAdmin) setLeadsLoading(false);
    }, (err) => {
      console.error("Failed to fetch personal leads:", err);
      if (!isAdmin) setLeadsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserEmail, isAdmin]);

  // 2. Fetch All Leads (Admin Only)
  useEffect(() => {
    if (!db || !isAdmin) return;

    const unsubscribe = onSnapshot(collection(db, 'leads'), (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let ts = new Date();
        if (data.timestamp) {
          if (data.timestamp.toDate) ts = data.timestamp.toDate();
          else if (data.timestamp.seconds) ts = new Date(data.timestamp.seconds * 1000);
        }
        return {
          id: doc.id,
          ...data,
          timestamp: ts
        } as Lead;
      });
      list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setAllLeads(list);
      setLeadsLoading(false);
    }, (err) => {
      console.error("Failed to fetch all leads:", err);
      setLeadsLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // 3. Handle Lead Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !phone.trim() || !description.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    const leadPayload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim() || 'N/A',
      dealValue: parseFloat(dealValue) || 0,
      description: description.trim(),
      notes: notes.trim() || '',
      status: 'New' as const,
      createdBy: userProfile?.name || 'Unknown Staff',
      createdByEmail: currentUserEmail,
      employeeId: userProfile?.employeeId || 'N/A',
      timestamp: Timestamp.fromDate(new Date())
    };

    try {
      if (db) {
        await addDoc(collection(db, 'leads'), leadPayload);
        setFormSuccess(true);
        // Reset form
        setCompanyName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setDealValue('');
        setDescription('');
        setNotes('');
        
        // Hide success message after 4s
        setTimeout(() => setFormSuccess(false), 4000);
      } else {
        // Fallback simulated success if db is offline
        console.log("Offline mode: Simulated lead generation payload:", leadPayload);
        setFormSuccess(true);
      }
    } catch (err: any) {
      console.error("Error generating lead:", err);
      setFormError(err.message || 'Failed to submit lead to database.');
    } finally {
      setFormLoading(false);
    }
  };

  // 4. Update Lead Status (Admin/Owner)
  const handleUpdateStatus = async (leadId: string) => {
    if (!db) return;
    try {
      const leadDocRef = doc(db, 'leads', leadId);
      await updateDoc(leadDocRef, {
        status: editStatus,
        notes: editNotes.trim()
      });
      setEditingLeadId(null);
    } catch (err) {
      console.error("Failed to update lead status:", err);
      alert("Failed to update status. Please verify database rules.");
    }
  };

  // 5. Delete Lead (Admin Only)
  const handleDeleteLead = async (leadId: string) => {
    if (!db || !window.confirm("Are you sure you want to permanently delete this lead?")) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Error deleting document. Verify permissions.");
    }
  };

  // 6. Calculate Stats (Admin Only)
  const stats = useMemo(() => {
    const total = allLeads.length;
    const wonLeads = allLeads.filter(l => l.status === 'Won');
    const lostLeads = allLeads.filter(l => l.status === 'Lost');
    const activeLeads = allLeads.filter(l => l.status !== 'Won' && l.status !== 'Lost');

    const conversionRate = total > 0 ? Math.round((wonLeads.length / total) * 100) : 0;
    const pipelineValue = activeLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    const wonRevenue = wonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

    return {
      total,
      wonCount: wonLeads.length,
      lostCount: lostLeads.length,
      activeCount: activeLeads.length,
      conversionRate,
      pipelineValue,
      wonRevenue
    };
  }, [allLeads]);

  // 7. Filter Leads (Admin List)
  const filteredAllLeads = useMemo(() => {
    return allLeads.filter(l => {
      const matchesSearch = 
        l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesCreator = creatorFilter === 'all' || l.createdByEmail === creatorFilter;

      return matchesSearch && matchesStatus && matchesCreator;
    });
  }, [allLeads, searchTerm, statusFilter, creatorFilter]);

  // Unique list of creators for filter dropdown
  const uniqueCreators = useMemo(() => {
    const emails = new Set<string>();
    const creators: { name: string; email: string }[] = [];
    allLeads.forEach(l => {
      if (l.createdByEmail && !emails.has(l.createdByEmail)) {
        emails.add(l.createdByEmail);
        creators.push({ name: l.createdBy, email: l.createdByEmail });
      }
    });
    return creators;
  }, [allLeads]);

  // Status Badge Colors Helper
  const getStatusStyle = (status: Lead['status']) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Contacted':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Proposal Sent':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Negotiation':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Won':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Lost':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full space-y-6">
      
      {/* Top Banner Tab Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 uppercase tracking-wider">Leads Pipeline</h3>
          <p className="text-xs text-slate-400 mt-1">Submit opportunities and track client conversions</p>
        </div>
        <div className="flex gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('all-leads')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'all-leads' 
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              All Pipeline
            </button>
          )}
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'submit' 
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Submit Lead
          </button>
          <button
            onClick={() => setActiveTab('my-leads')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'my-leads' 
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            My Leads ({myLeads.length})
          </button>
        </div>
      </div>

      {/* Main Tab Views Switcher */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: FORM SUBMISSION */}
          {activeTab === 'submit' && (
            <motion.div
              key="submit-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h4 className="text-base font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-cyan-400" />
                  Lead Registration Form
                </h4>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {formSuccess && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-center gap-3"
                    >
                      <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                      <span>Thank you! The lead opportunity has been successfully submitted and logged.</span>
                    </motion.div>
                  )}

                  {formError && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Company Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Company / Organization <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g., Siemens Energy"
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Contact Person Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Contact Person Name <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="e.g., John Doe"
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Contact Phone Number <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g., +91 98765 43210"
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Contact Email */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Contact Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g., contact@company.com"
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Estimated Deal Value */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Estimated Deal Value (INR)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="number"
                          value={dealValue}
                          onChange={(e) => setDealValue(e.target.value)}
                          placeholder="e.g., 250000"
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Opportunity Description */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Opportunity Details / Description <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-4 w-4 h-4 text-slate-500" />
                        <textarea
                          required
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the lead, project scope, client requirements, or what products/services they are interested in..."
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner resize-none"
                        />
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Internal Progress Notes</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-4 w-4 h-4 text-slate-500" />
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any initial feedback, next follow-up dates, or internal coordination detail..."
                          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 placeholder:text-slate-550 text-slate-100 shadow-inner resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:shadow-lg shadow-cyan-500/10 transition-all active:scale-95 duration-150 disabled:opacity-50 min-h-[44px] cursor-pointer"
                    >
                      {formLoading ? 'Submitting...' : 'Register Opportunity'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MY LEADS (EMPLOYEE PERSONAL HISTORY) */}
          {activeTab === 'my-leads' && (
            <motion.div
              key="my-leads-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col space-y-4"
            >
              {leadsLoading ? (
                <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
                  <Clock className="w-6 h-6 animate-spin text-cyan-400 mr-3" />
                  <span>Loading submissions...</span>
                </div>
              ) : myLeads.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800/80 text-slate-500 text-sm">
                  <Briefcase className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                  <p>You haven't submitted any leads yet.</p>
                  <p className="text-xs text-slate-650 mt-1">Generate a lead and use the Submit Form to register opportunities.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto max-h-[70vh] pr-2">
                  {myLeads.map((lead) => (
                    <div key={lead.id} className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-750/80 shadow-md transition-all flex flex-col justify-between space-y-4 relative">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-slate-200 text-sm truncate leading-snug">{lead.companyName}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${getStatusStyle(lead.status)}`}>
                            {lead.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 space-y-1">
                          <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-550 shrink-0" /> {lead.contactPerson}</p>
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-550 shrink-0" /> {lead.phone}</p>
                          {lead.email !== 'N/A' && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-550 shrink-0" /> {lead.email}</p>}
                          {lead.dealValue > 0 && (
                            <p className="flex items-center gap-1.5 font-semibold text-slate-300">
                              <IndianRupee className="w-3.5 h-3.5 text-slate-550 shrink-0" /> 
                              {lead.dealValue.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                        <div className="border-t border-slate-800/80 pt-2.5">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-450">Opportunity Scope:</span>
                          <p className="text-xs text-slate-350 line-clamp-3 mt-0.5 leading-relaxed">{lead.description}</p>
                        </div>
                        {lead.notes && (
                          <div className="bg-slate-950/20 border border-slate-800/60 p-2.5 rounded-xl text-[11px] text-slate-400 mt-2">
                            <span className="font-semibold text-cyan-405 block text-[9px] uppercase tracking-wider">Status Update Notes:</span>
                            <p className="mt-0.5 italic text-slate-400">"{lead.notes}"</p>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Submitted on {lead.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ALL LEADS (ADMIN ONLY VIEW & MANAGEMENT) */}
          {activeTab === 'all-leads' && isAdmin && (
            <motion.div
              key="all-leads-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col space-y-6"
            >
              {/* Stats Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Opportunities</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Briefcase className="w-5 h-5 text-cyan-400" />
                    <span className="text-lg font-bold text-slate-100">{stats.total}</span>
                  </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pipeline Value</span>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <span className="text-lg font-bold text-slate-100">
                      ₹{stats.pipelineValue >= 100000 
                        ? (stats.pipelineValue / 100000).toFixed(1) + 'L' 
                        : stats.pipelineValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Revenue Converted</span>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-lg font-bold text-slate-100">
                      ₹{stats.wonRevenue >= 100000 
                        ? (stats.wonRevenue / 100000).toFixed(1) + 'L' 
                        : stats.wonRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Conversion Rate</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <span className="text-lg font-bold text-slate-100">{stats.conversionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Filters Box */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by company, client or creator..."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 placeholder:text-slate-550 text-slate-100"
                  />
                </div>
                <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
                  {/* Status Filter */}
                  <div className="flex items-center gap-2 text-xs text-slate-450 border border-slate-800 bg-slate-900/40 px-2.5 py-1.5 rounded-xl shrink-0">
                    <Filter className="w-3.5 h-3.5 text-slate-550" />
                    <span>Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent focus:outline-none text-slate-300 font-medium cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                  {/* Creator Filter */}
                  <div className="flex items-center gap-2 text-xs text-slate-450 border border-slate-800 bg-slate-900/40 px-2.5 py-1.5 rounded-xl shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-550" />
                    <span>Employee:</span>
                    <select
                      value={creatorFilter}
                      onChange={(e) => setCreatorFilter(e.target.value)}
                      className="bg-transparent focus:outline-none text-slate-300 font-medium cursor-pointer max-w-[150px]"
                    >
                      <option value="all">All Members</option>
                      {uniqueCreators.map(c => (
                        <option key={c.email} value={c.email}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {leadsLoading ? (
                <div className="flex justify-center py-20 text-slate-400">
                  <Clock className="w-6 h-6 animate-spin text-cyan-400 mr-3" />
                  <span>Loading Pipeline Database...</span>
                </div>
              ) : filteredAllLeads.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800 text-slate-550 text-sm">
                  <Briefcase className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                  No leads found matching current query or filters.
                </div>
              ) : (
                <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-slate-300">
                      <thead className="bg-[#0b0f19] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Company</th>
                          <th className="p-4">Contact Detail</th>
                          <th className="p-4">Deal Value</th>
                          <th className="p-4">Generated By</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/10">
                        {filteredAllLeads.map((lead) => {
                          const isEditing = editingLeadId === lead.id;
                          return (
                            <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors duration-100">
                              {/* Company */}
                              <td className="p-4 font-semibold text-slate-200">
                                <div className="space-y-1">
                                  <p>{lead.companyName}</p>
                                  <p className="text-[10px] text-slate-450 leading-relaxed font-normal line-clamp-1 max-w-[200px]" title={lead.description}>
                                    {lead.description}
                                  </p>
                                </div>
                              </td>

                              {/* Contact Detail */}
                              <td className="p-4 text-[11px] text-slate-400">
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-slate-350">{lead.contactPerson}</p>
                                  <p>{lead.phone}</p>
                                  {lead.email !== 'N/A' && <p className="opacity-80">{lead.email}</p>}
                                </div>
                              </td>

                              {/* Deal Value */}
                              <td className="p-4 text-slate-200 font-semibold">
                                {lead.dealValue > 0 ? `₹${lead.dealValue.toLocaleString('en-IN')}` : 'N/A'}
                              </td>

                              {/* Generated By */}
                              <td className="p-4 text-slate-350">
                                <div className="space-y-0.5">
                                  <p className="font-medium">{lead.createdBy}</p>
                                  <p className="text-[10px] text-slate-500">ID: {lead.employeeId}</p>
                                </div>
                              </td>

                              {/* Date */}
                              <td className="p-4 text-slate-450">
                                {lead.timestamp.toLocaleDateString()}
                              </td>

                              {/* Status Column */}
                              <td className="p-4">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1.5">
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value as Lead['status'])}
                                      className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-lg p-1 focus:outline-none"
                                    >
                                      <option value="New">New</option>
                                      <option value="Contacted">Contacted</option>
                                      <option value="Proposal Sent">Proposal Sent</option>
                                      <option value="Negotiation">Negotiation</option>
                                      <option value="Won">Won</option>
                                      <option value="Lost">Lost</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      placeholder="Add progress details..."
                                      className="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded-lg p-1 focus:outline-none placeholder:text-slate-600"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border inline-block ${getStatusStyle(lead.status)}`}>
                                      {lead.status}
                                    </span>
                                    {lead.notes && (
                                      <p className="text-[10px] text-slate-450 italic line-clamp-1 max-w-[150px]" title={lead.notes}>
                                        "{lead.notes}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-center">
                                {isEditing ? (
                                  <div className="flex justify-center items-center gap-1">
                                    <button
                                      onClick={() => handleUpdateStatus(lead.id)}
                                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/20 cursor-pointer active:scale-95"
                                      title="Save Changes"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingLeadId(null)}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 cursor-pointer active:scale-95"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingLeadId(lead.id);
                                        setEditStatus(lead.status);
                                        setEditNotes(lead.notes || '');
                                      }}
                                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/10 cursor-pointer active:scale-95 duration-150"
                                      title="Update Status"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLead(lead.id)}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/10 cursor-pointer active:scale-95 duration-150"
                                      title="Delete Lead"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
