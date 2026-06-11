import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trash2, 
  Loader2, 
  UserPlus, 
  ShieldAlert, 
  Shield, 
  ArrowRight,
  TrendingUp,
  Eye,
  Phone,
  Briefcase,
  Calendar,
  Award,
  X,
  ChevronDown,
  Wifi,
  Edit,
  Camera,
  Upload
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { supabase } from '../supabase';

export default function TeamControl() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin } = useOutletContext<any>();

  const [teamList, setTeamList] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newAccessRole, setNewAccessRole] = useState('User');
  const [newStatus, setNewStatus] = useState('Active');
  const [newPhone, setNewPhone] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations Control');
  const [newJoinedDate, setNewJoinedDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSkills, setNewSkills] = useState('');
  const [newAvatar, setNewAvatar] = useState('cyan');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string>('');
  
  // Emergency & Medical States
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newBloodGroup, setNewBloodGroup] = useState('');
  const [newMedicalConditions, setNewMedicalConditions] = useState('');
  
  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [openEditDropdown, setOpenEditDropdown] = useState<'dept' | 'priority' | 'status' | 'avatar' | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editJoinedDate, setEditJoinedDate] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editMedicalConditions, setEditMedicalConditions] = useState('');
  const [editAvatar, setEditAvatar] = useState('cyan');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');

  // Compress image to base64 (fallback when Supabase is unavailable)
  const compressImageToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 256;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
            else { width = Math.round((width / height) * MAX); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    });

  // Upload employee photo — Supabase Storage first, base64 fallback
  const uploadEmployeePhoto = async (file: File, empId: string): Promise<string> => {
    if (supabase) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `team-photos/${empId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('APECERP')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('APECERP').getPublicUrl(path);
        return data.publicUrl;
      }
    }
    // Fallback: compress & store as base64 in Firestore
    return compressImageToBase64(file);
  };

  const getVerificationUrl = (profile: any) => {
    if (!profile) return '';
    const empId = (profile.employeeId && profile.employeeId !== 'undefined') ? profile.employeeId : profile.id;
    return `${window.location.origin}/profile/${empId}`;
  };
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'dept' | 'priority' | 'status' | 'avatar' | null>(null);



  const handleSaveProfileChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !db) return;
    if (!editName.trim() || !editEmail.trim()) {
      alert('Name and Email are required.');
      return;
    }

    setIsDbActionLoading(true);
    try {
      const formattedSkills = editSkills
        ? editSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const empId = editEmployeeId.trim() || selectedProfile.employeeId || selectedProfile.id;
      const profileLink = `${window.location.origin}/profile/${empId}`;

      // Upload new photo to Supabase (base64 fallback if unavailable)
      let photoUrl = selectedProfile.photoUrl || '';
      if (editPhotoFile) {
        try { photoUrl = await uploadEmployeePhoto(editPhotoFile, empId); } catch {}
      }

      const updatedFields = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole.trim() || 'Staff Member',
        phone: editPhone.trim() || 'N/A',
        employeeId: empId,
        department: editDepartment,
        status: editStatus,
        joinedDate: editJoinedDate,
        skills: formattedSkills,
        avatar: editAvatar,
        photoUrl,
        emergencyName: editEmergencyName.trim() || 'N/A',
        emergencyPhone: editEmergencyPhone.trim() || 'N/A',
        bloodGroup: editBloodGroup || 'N/A',
        medicalConditions: editMedicalConditions.trim() || 'None',
        profileUrl: profileLink
      };

      await updateDoc(doc(db, 'team', selectedProfile.id), updatedFields);

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Profile Updated',
        desc: `Administrative updates saved for "${editName.trim()}" (Role: ${editRole.trim() || 'Staff Member'})`,
        type: 'settings',
        timestamp: Timestamp.now()
      });

      // Update local state to reflect changes
      setSelectedProfile((prev: any) => ({
        ...prev,
        ...updatedFields
      }));

      setEditPhotoFile(null);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to save profile changes. Please try again.');
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTeamLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch all team members
  useEffect(() => {
    if (!db || !isAdmin) {
      setIsTeamLoading(false);
      return;
    }

    const unsubTeam = onSnapshot(collection(db, 'team'), (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamList(members);
      setIsTeamLoading(false);
    }, (err) => {
      console.error('Team Control listener error:', err);
      setFirestoreError(err.code);
      setIsTeamLoading(false);
    });

    return () => unsubTeam();
  }, [isAdmin, setFirestoreError]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !db) return;

    setIsDbActionLoading(true);
    try {
      const formattedSkills = newSkills
        ? newSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const empId = newEmployeeId.trim() || `APEC-${Math.floor(1000 + Math.random() * 9000)}`;
      const profileLink = `${window.location.origin}/profile/${empId}`;

      // Upload photo to Supabase (base64 fallback if unavailable)
      let photoUrl = '';
      if (newPhotoFile) {
        try { photoUrl = await uploadEmployeePhoto(newPhotoFile, empId); } catch {}
      }

      await addDoc(collection(db, 'team'), {
        name: newName,
        email: newEmail.trim(),
        role: newRole || 'Staff Member',
        accessRole: newAccessRole,
        status: newStatus,
        phone: newPhone || 'N/A',
        employeeId: empId,
        department: newDepartment,
        joinedDate: newJoinedDate,
        skills: formattedSkills,
        avatar: newAvatar,
        photoUrl,
        emergencyName: newEmergencyName.trim() || 'N/A',
        emergencyPhone: newEmergencyPhone.trim() || 'N/A',
        bloodGroup: newBloodGroup || 'N/A',
        medicalConditions: newMedicalConditions.trim() || 'None',
        profileUrl: profileLink
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Team member added',
        desc: `"${newName}" was registered as an ERP user with role "${newRole || 'Staff Member'}" in ${newDepartment}`,
        type: 'task',
        timestamp: Timestamp.now()
      });

      setNewName('');
      setNewEmail('');
      setNewRole('');
      setNewAccessRole('User');
      setNewStatus('Active');
      setNewPhone('');
      setNewEmployeeId('');
      setNewDepartment('Operations Control');
      setNewJoinedDate(new Date().toISOString().slice(0, 10));
      setNewSkills('');
      setNewAvatar('cyan');
      setNewPhotoFile(null);
      setNewPhotoPreview('');
      setNewEmergencyName('');
      setNewEmergencyPhone('');
      setNewBloodGroup('');
      setNewMedicalConditions('');
      setIsAddingUser(false);
    } catch (err) {
      console.error('Error adding user:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleTogglePriority = async (id: string, currentRole: string, userName: string) => {
    if (!db) return;
    setIsDbActionLoading(true);
    const nextRole = currentRole === 'Admin' ? 'User' : 'Admin';
    try {
      await updateDoc(doc(db, 'team', id), {
        accessRole: nextRole
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'User role updated',
        desc: `"${userName}" was ${nextRole === 'Admin' ? 'promoted to Admin' : 'demoted to User'} priority`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error updating user role:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!db) return;
    if (!window.confirm(`Are you sure you want to revoke access and delete user "${userName}"?`)) return;

    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, 'team', id));
      
      // Log activity
      await addDoc(collection(db, 'activities'), {
        title: 'Access credentials revoked',
        desc: `"${userName}" was removed from the ERP database`,
        type: 'settings',
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Gatekeeping page view
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center h-[calc(100vh-250px)]">
        <div className="w-16 h-16 rounded-full bg-rose-955/20 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Restricted Operations Terminal</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
          Access denied. The User Management console requires administrative credentials. Contact the managing director to configure access roles.
        </p>
      </div>
    );
  }

  if (isTeamLoading) {
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
      className="space-y-6"
    >
      {openDropdown && (
        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setOpenDropdown(null)} />
      )}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Team Control Panel</h3>
          <p className="text-xs text-slate-400 mt-1">Configure credentials, access priorities, and security roles</p>
        </div>
        <button 
          onClick={() => setIsAddingUser(!isAddingUser)}
          disabled={isDbActionLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50"
        >
          {isAddingUser ? 'Back to Registry' : 'Add Team Member'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAddingUser ? (
          <motion.div 
            key="user-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-5xl glass-card p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] mx-auto"
          >
            <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Register Operations Account
            </h4>
            <form onSubmit={handleAddUser} className="space-y-6">
              {/* Section 1: Profile Identity */}
              <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  1. Profile Identity
                </h5>
                <div className="flex gap-6">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors group cursor-pointer bg-slate-950/40">
                      {newPhotoPreview ? (
                        <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 group-hover:text-cyan-400 transition-colors">
                          <Camera className="w-6 h-6" />
                          <span className="text-[8px] font-bold uppercase tracking-wider">Photo</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewPhotoFile(file);
                            setNewPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider text-center">Click to<br/>upload</span>
                  </div>
                  {/* Text fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Full Name</label>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Email Address</label>
                      <input 
                        type="email" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. rahul@apec.com"
                        required
                        className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Phone Number</label>
                      <input 
                        type="tel" 
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Role & Department */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  2. Role & Department
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Role Description</label>
                    <input 
                      type="text" 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="e.g. Lead Technician"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Department</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'dept' ? null : 'dept')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newDepartment}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'dept' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'dept' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            "Operations Control",
                            "Solar Installation",
                            "High Voltage Substations",
                            "Grid Automation",
                            "Safety & Compliance"
                          ].map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setNewDepartment(dept);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newDepartment === dept 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{dept}</span>
                              {newDepartment === dept && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Employee ID</label>
                    <input 
                      type="text" 
                      value={newEmployeeId}
                      onChange={(e) => setNewEmployeeId(e.target.value)}
                      placeholder="APEC-2026-042 (Optional)"
                      className="w-full bg-slate-955/60 border border-slate-850 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Access Control & Skills */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  3. Access Control & Skills
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Joined Date</label>
                    <input 
                      type="date" 
                      value={newJoinedDate}
                      onChange={(e) => setNewJoinedDate(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Skills & Certifications</label>
                    <input 
                      type="text" 
                      value={newSkills}
                      onChange={(e) => setNewSkills(e.target.value)}
                      placeholder="e.g. HV Licensing, First Aid"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Access Priority</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newAccessRole === 'Admin' ? 'Admin (Full)' : 'User (Standard)'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'priority' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'priority' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            { value: 'User', label: 'User (Standard)' },
                            { value: 'Admin', label: 'Admin (Full)' }
                          ].map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                setNewAccessRole(role.value);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newAccessRole === role.value 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{role.label}</span>
                              {newAccessRole === role.value && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Status</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span>{newStatus}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'status' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {["Active", "Site Visit", "On Leave"].map((statusVal) => (
                            <button
                              key={statusVal}
                              type="button"
                              onClick={() => {
                                setNewStatus(statusVal);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newStatus === statusVal 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{statusVal}</span>
                              {newStatus === statusVal && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Avatar Theme</label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'avatar' ? null : 'avatar')}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-cyan-505 text-xs flex justify-between items-center transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:ring-1 focus:ring-cyan-500/10 cursor-pointer text-left"
                    >
                      <span className="capitalize">{newAvatar} Theme</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openDropdown === 'avatar' ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === 'avatar' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                        >
                          {[
                            { value: 'cyan', label: 'Cyan Theme' },
                            { value: 'blue', label: 'Blue Theme' },
                            { value: 'red', label: 'Red Theme' },
                            { value: 'gold', label: 'Gold Theme' }
                          ].map((theme) => (
                            <button
                              key={theme.value}
                              type="button"
                              onClick={() => {
                                setNewAvatar(theme.value);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                newAvatar === theme.value 
                                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                  : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                              }`}
                            >
                              <span>{theme.label}</span>
                              {newAvatar === theme.value && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
              </div>

              {/* Section 4: Health & Emergency Credentials */}
              <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-3">
                  4. Health & Emergency Credentials
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Name</label>
                    <input 
                      type="text" 
                      value={newEmergencyName}
                      onChange={(e) => setNewEmergencyName(e.target.value)}
                      placeholder="e.g. Jane Doe (Spouse)"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Phone</label>
                    <input 
                      type="text" 
                      value={newEmergencyPhone}
                      onChange={(e) => setNewEmergencyPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Blood Group</label>
                    <select
                      value={newBloodGroup}
                      onChange={(e) => setNewBloodGroup(e.target.value)}
                      className="w-full bg-slate-955/60 border border-slate-805 text-slate-100 rounded-xl py-2.5 px-3.5 text-slate-150 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    >
                      <option value="">Select Blood Group...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Medical Conditions / Notes</label>
                    <input 
                      type="text" 
                      value={newMedicalConditions}
                      onChange={(e) => setNewMedicalConditions(e.target.value)}
                      placeholder="e.g. Peanut allergy, Asthma, None"
                      className="w-full bg-slate-955/60 border border-slate-805 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                    />
                  </div>
                </div>
              </div>


              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-305 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDbActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Team Member'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="user-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
          >
            {teamList.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Users className="w-14 h-14 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">Database registry is empty</p>
                <p className="text-xs text-slate-505 mt-1">Populate users by clicking "Add Team Member".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-955/45 uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Role / Department</th>
                      <th className="p-4">Access Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm text-slate-355">
                    {teamList.map((m) => {
                      const isMemberAdmin = m.accessRole === 'Admin' || m.roleType === 'Admin' || [
                        'admin@apecpowersolutions.com',
                        'managingdirector@apecpowersolutions.com'
                      ].includes(m.email?.toLowerCase());

                      const avatarColors: Record<string, string> = {
                        cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-405 border-cyan-500/25',
                        blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25',
                        red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
                        gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
                      };
                      const avatarClass = avatarColors[m.avatar || 'cyan'] || avatarColors.cyan;

                      return (
                        <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-450">{m.employeeId || 'APEC-MEMBER'}</td>
                          <td className="p-4 font-bold text-slate-100 flex items-center gap-2.5">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0" />
                            ) : (
                              <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarClass} border flex items-center justify-center text-[10px] font-extrabold shrink-0`}>
                                {m.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="truncate max-w-[120px]" title={m.name}>{m.name}</span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-205 truncate max-w-[150px]">{m.role}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{m.department || 'Operations'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isMemberAdmin 
                                ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            } border`}>
                              {isMemberAdmin ? (
                                <>
                                  <Shield className="w-3 h-3 text-cyan-455" />
                                  Admin
                                  </>
                              ) : (
                                'User'
                              )}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              m.status === 'Active' ? 'bg-green-955/40 text-green-400 border border-green-500/25' :
                              m.status === 'Site Visit' ? 'bg-cyan-955/40 text-cyan-400 border border-cyan-500/25' :
                              'bg-amber-955/40 text-amber-400 border border-amber-500/25'
                            }`}>
                              {m.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* View details */}
                              <button
                                onClick={() => setSelectedProfile(m)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-950/20"
                                title="View Complete Profile Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Toggle Priority */}
                              <button
                                onClick={() => handleTogglePriority(m.id, isMemberAdmin ? 'Admin' : 'User', m.name)}
                                disabled={isDbActionLoading || ['admin@apecpowersolutions.com', 'managingdirector@apecpowersolutions.com'].includes(m.email?.toLowerCase())}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-950/20 disabled:opacity-30"
                                title={isMemberAdmin ? 'Demote to Standard User' : 'Promote to Administrative Access'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>

                              {/* Remove User */}
                              <button
                                onClick={() => handleDeleteUser(m.id, m.name)}
                                disabled={isDbActionLoading || ['admin@apecpowersolutions.com', 'managingdirector@apecpowersolutions.com'].includes(m.email?.toLowerCase())}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded hover:bg-rose-955/20 disabled:opacity-30"
                                title="Revoke Credentials & Remove User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Drawer Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-955/65 backdrop-blur-sm"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg glass-card p-6 rounded-2xl shadow-2xl border border-white/10 z-10 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {!isEditingProfile && (
                  <button 
                    onClick={() => {
                      setEditName(selectedProfile.name || '');
                      setEditEmail(selectedProfile.email || '');
                      setEditRole(selectedProfile.role || '');
                      setEditPhone(selectedProfile.phone || '');
                      setEditEmployeeId(selectedProfile.employeeId || '');
                      setEditDepartment(selectedProfile.department || 'Operations Control');
                      setEditStatus(selectedProfile.status || 'Active');
                      setEditJoinedDate(selectedProfile.joinedDate || '');
                      setEditSkills(selectedProfile.skills ? selectedProfile.skills.join(', ') : '');
                      setEditEmergencyName(selectedProfile.emergencyName || '');
                      setEditEmergencyPhone(selectedProfile.emergencyPhone || '');
                      setEditBloodGroup(selectedProfile.bloodGroup || '');
                      setEditMedicalConditions(selectedProfile.medicalConditions || '');
                      setEditAvatar(selectedProfile.avatar || 'cyan');
                      setEditPhotoPreview(selectedProfile.photoUrl || '');
                      setEditPhotoFile(null);
                      setIsEditingProfile(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-cyan-400 border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-500/40 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    Edit Profile
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedProfile(null);
                    setIsEditingProfile(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {(isEditingProfile ? editPhotoPreview : selectedProfile.photoUrl) ? (
                  <img 
                    src={isEditingProfile ? editPhotoPreview : selectedProfile.photoUrl} 
                    alt={selectedProfile.name} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-sm shrink-0"
                  />
                ) : (
                  <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                    (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/25' :
                    (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25' :
                    (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25' :
                    'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
                  } border flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0`}>
                    {((isEditingProfile ? editName : selectedProfile.name) || 'AP').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h4 className="text-lg font-bold text-slate-100">{isEditingProfile ? (editName || 'New Profile') : selectedProfile.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-rose-500 font-bold">{isEditingProfile ? (editRole || 'Staff Member') : selectedProfile.role}</span>
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-slate-400 font-mono">
                      {isEditingProfile ? (editEmployeeId || 'APEC-MEMBER') : (selectedProfile.employeeId || 'APEC-MEMBER')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Company ID Pass Card Container */}
              <div className="relative w-full max-w-sm h-48 mx-auto rounded-2xl p-5 overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/40 backdrop-blur-md shadow-2xl flex flex-col justify-between group hover:border-cyan-500/50 transition-all duration-300">
                {/* Grid Background */}
                <div className="absolute inset-0 cyber-grid opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                
                {/* ID Badge Shield Symbol */}
                <div className="absolute top-5 right-5 text-cyan-400/40">
                  <Shield className="w-6 h-6" />
                </div>
                
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">APEC Company ID</h5>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Digital Credential</span>
                  </div>
                  <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border ${
                    selectedProfile.accessRole === 'Admin' || selectedProfile.roleType === 'Admin' || [
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedProfile.email?.toLowerCase())
                      ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  } font-mono`}>
                    {selectedProfile.accessRole === 'Admin' || selectedProfile.roleType === 'Admin' || [
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedProfile.email?.toLowerCase()) ? 'ADMIN ACCESS' : 'STAFF ACCESS'}
                  </span>
                </div>

                {/* Profile Avatar / Info */}
                <div className="flex items-center gap-3">
                  {(isEditingProfile ? editPhotoPreview : selectedProfile.photoUrl) ? (
                    <img 
                      src={isEditingProfile ? editPhotoPreview : selectedProfile.photoUrl}
                      alt={selectedProfile.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0"
                    />
                  ) : (
                    <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'cyan' ? 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20' :
                      (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20' :
                      (isEditingProfile ? editAvatar : selectedProfile.avatar) === 'red' ? 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20' :
                      'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20'
                    } border flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0`}>
                      {((isEditingProfile ? editName : selectedProfile.name) || 'AP').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{isEditingProfile ? (editName || 'New Profile') : selectedProfile.name}</h4>
                    <p className="text-[10px] text-rose-500 font-bold truncate leading-tight">{isEditingProfile ? (editRole || 'Staff Member') : selectedProfile.role}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{isEditingProfile ? editDepartment : (selectedProfile.department || 'Operations')}</p>
                  </div>
                </div>

                {/* Company ID Info */}
                <div className="flex justify-between items-end border-t border-slate-800/60 pt-2.5 font-mono text-[9px]">
                  <div>
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider">EMPLOYEE ID</span>
                    <span className="font-bold text-cyan-400">
                      {isEditingProfile ? (editEmployeeId || 'APEC-MEMBER') : (selectedProfile.employeeId || 'APEC-MEMBER')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[7px] tracking-wider text-right">STATUS</span>
                    <span className={`font-bold uppercase block text-right ${
                      (isEditingProfile ? editStatus : selectedProfile.status) === 'Active' ? 'text-green-400' :
                      (isEditingProfile ? editStatus : selectedProfile.status) === 'Site Visit' ? 'text-cyan-400' :
                      'text-amber-400'
                    }`}>
                      {isEditingProfile ? editStatus : (selectedProfile.status || 'Active')}
                    </span>
                  </div>
                </div>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfileChanges} className="space-y-6">
                  {/* Section 1: Identity */}
                  <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-white/5">
                    <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-2">
                      1. Profile Identity
                    </h5>
                    {/* Photo Upload Row */}
                    <div className="flex items-center gap-4 pb-3 border-b border-slate-900/40">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer bg-slate-950/40 group shrink-0">
                        {editPhotoPreview ? (
                          <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 group-hover:text-cyan-400 transition-colors">
                            <Camera className="w-5 h-5" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditPhotoFile(file);
                              setEditPhotoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Employee Photo</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Click the box to change photo. Uploaded to Firebase Storage.</p>
                        {editPhotoPreview && (
                          <button type="button" onClick={() => { setEditPhotoPreview(''); setEditPhotoFile(null); }} className="text-[9px] text-rose-400 hover:text-rose-300 mt-1 font-bold uppercase tracking-wider">Remove Photo</button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Full Name</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Role Description</label>
                        <input 
                          type="text" 
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Employee ID</label>
                        <input 
                          type="text" 
                          value={editEmployeeId}
                          onChange={(e) => setEditEmployeeId(e.target.value)}
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Phone Number</label>
                        <input 
                          type="text" 
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Email Address</label>
                        <input 
                          type="email" 
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          required
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Department, Status & Details */}
                  <div className="space-y-3 p-4 bg-slate-955/20 rounded-xl border border-white/5">
                    <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-1.5 mb-2">
                      2. Access & Operations
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Department Select */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Department</label>
                        <button
                          type="button"
                          onClick={() => setOpenEditDropdown(openEditDropdown === 'dept' ? null : 'dept')}
                          className="w-full bg-slate-955/60 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all cursor-pointer text-left"
                        >
                          <span>{editDepartment}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openEditDropdown === 'dept' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openEditDropdown === 'dept' && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                            >
                              {[
                                "Operations Control",
                                "Solar Installation",
                                "High Voltage Substations",
                                "Grid Automation",
                                "Safety & Compliance"
                              ].map((dept) => (
                                <button
                                  key={dept}
                                  type="button"
                                  onClick={() => {
                                    setEditDepartment(dept);
                                    setOpenEditDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                    editDepartment === dept 
                                      ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                                  }`}
                                >
                                  <span>{dept}</span>
                                  {editDepartment === dept && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Status Select */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Status</label>
                        <button
                          type="button"
                          onClick={() => setOpenEditDropdown(openEditDropdown === 'status' ? null : 'status')}
                          className="w-full bg-slate-955/60 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500/50 text-xs flex justify-between items-center transition-all cursor-pointer text-left"
                        >
                          <span>{editStatus}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openEditDropdown === 'status' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openEditDropdown === 'status' && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                            >
                              {["Active", "Site Visit", "On Leave"].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    setEditStatus(st);
                                    setOpenEditDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                    editStatus === st 
                                      ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                                  }`}
                                >
                                  <span>{st}</span>
                                  {editStatus === st && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Joined Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Joined Date</label>
                        <input 
                          type="date" 
                          value={editJoinedDate}
                          onChange={(e) => setEditJoinedDate(e.target.value)}
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono"
                        />
                      </div>

                      {/* Avatar Theme Select */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Avatar Theme</label>
                        <button
                          type="button"
                          onClick={() => setOpenEditDropdown(openEditDropdown === 'avatar' ? null : 'avatar')}
                          className="w-full bg-slate-955/60 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-505 text-xs flex justify-between items-center transition-all cursor-pointer text-left font-mono"
                        >
                          <span className="capitalize">{editAvatar} Theme</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${openEditDropdown === 'avatar' ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openEditDropdown === 'avatar' && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute z-30 w-full mt-1 bg-[#090d16]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 space-y-0.5"
                            >
                              {[
                                { value: 'cyan', label: 'Cyan Theme' },
                                { value: 'blue', label: 'Blue Theme' },
                                { value: 'red', label: 'Red Theme' },
                                { value: 'gold', label: 'Gold Theme' }
                              ].map((theme) => (
                                <button
                                  key={theme.value}
                                  type="button"
                                  onClick={() => {
                                    setEditAvatar(theme.value);
                                    setOpenEditDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                    editAvatar === theme.value 
                                      ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
                                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
                                  }`}
                                >
                                  <span>{theme.label}</span>
                                  {editAvatar === theme.value && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Skills & Certifications */}
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Skills & Certifications (comma separated)</label>
                        <input 
                          type="text" 
                          value={editSkills}
                          onChange={(e) => setEditSkills(e.target.value)}
                          placeholder="e.g. Solar, HV Safety, LOTO"
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Health & Emergency */}
                  <div className="space-y-3 p-4 bg-rose-955/5 rounded-xl border border-rose-500/10">
                    <h5 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest border-b border-rose-900/60 pb-1.5 mb-2">
                      3. Health & Emergency Credentials
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Name</label>
                        <input 
                          type="text" 
                          value={editEmergencyName}
                          onChange={(e) => setEditEmergencyName(e.target.value)}
                          placeholder="Contact name"
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Emergency Contact Phone</label>
                        <input 
                          type="text" 
                          value={editEmergencyPhone}
                          onChange={(e) => setEditEmergencyPhone(e.target.value)}
                          placeholder="Contact phone"
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Blood Group</label>
                        <select
                          value={editBloodGroup}
                          onChange={(e) => setEditBloodGroup(e.target.value)}
                          className="w-full bg-slate-955/60 border border-slate-800 text-slate-150 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer rounded-xl py-2 px-3 text-slate-100 bg-[#090d16]"
                        >
                          <option value="">Select Blood Group...</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block ml-1">Medical Notes</label>
                        <input 
                          type="text" 
                          value={editMedicalConditions}
                          onChange={(e) => setEditMedicalConditions(e.target.value)}
                          placeholder="Allergies, chronic conditions"
                          className="w-full bg-slate-955/60 border border-slate-800 focus:border-cyan-500/50 text-slate-100 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={isDbActionLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDbActionLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Profile Changes</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="w-full py-2.5 bg-slate-805 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-955/45 p-4 rounded-xl border border-slate-900/60 font-mono">
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Department</span>
                      <span className="text-slate-350 font-bold flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
                        {selectedProfile.department || 'Operations'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedProfile.status === 'Active' ? 'bg-green-500/10 text-green-450 border border-green-500/20' :
                        selectedProfile.status === 'Site Visit' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      } border`}>
                        {selectedProfile.status || 'Active'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Email Address</span>
                      <span className="text-slate-350 font-bold block truncate">{selectedProfile.email}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Phone Number</span>
                      <span className="text-slate-350 font-bold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-cyan-500" />
                        {selectedProfile.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-1 col-span-2 border-t border-slate-900/80 pt-2 mt-1">
                      <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Joined Date</span>
                      <span className="text-slate-350 font-bold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                        {selectedProfile.joinedDate ? new Date(selectedProfile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-1 col-span-2 border-t border-slate-900/80 pt-2 flex justify-between items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Verification Link</span>
                        <a 
                          href={getVerificationUrl(selectedProfile)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-cyan-400 hover:underline font-bold text-[10px] block truncate"
                          title="Open Profile Page"
                        >
                          {getVerificationUrl(selectedProfile).replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getVerificationUrl(selectedProfile));
                          alert("Employee profile verification link copied to clipboard!");
                        }}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-900 hover:border-cyan-500/30 hover:text-cyan-400 text-slate-400 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer font-mono shrink-0"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  {/* Emergency & Medical Credentials */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Emergency & Medical Info</span>
                    <div className="grid grid-cols-2 gap-4 text-xs bg-rose-955/5 p-4 rounded-xl border border-rose-500/10 font-mono">
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Emergency Contact</span>
                        <span className="text-slate-200 font-bold block truncate">{selectedProfile.emergencyName || 'N/A'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Contact Phone</span>
                        <span className="text-slate-200 font-bold block truncate">{selectedProfile.emergencyPhone || 'N/A'}</span>
                      </div>
                      <div className="space-y-1 col-span-2 border-t border-slate-900/60 pt-2 mt-1 flex justify-between gap-6">
                        <div className="space-y-1">
                          <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Blood Group</span>
                          <span className="text-rose-400 font-bold flex items-center gap-1 text-rose-405">
                            <span className="text-[10px]">🩸</span> {selectedProfile.bloodGroup || 'N/A'}
                          </span>
                        </div>
                        <div className="space-y-1 flex-1">
                          <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Medical Notes</span>
                          <span className="text-slate-355 font-medium block truncate" title={selectedProfile.medicalConditions}>
                            {selectedProfile.medicalConditions || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Skills & Certifications</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                        selectedProfile.skills.map((skill: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-900 text-xs text-slate-400 font-semibold flex items-center gap-1">
                            <Award className="w-3 h-3 text-cyan-500" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-505 italic">No specialized skills/certifications listed</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
