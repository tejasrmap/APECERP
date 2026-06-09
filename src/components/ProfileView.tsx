import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Briefcase, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  ShieldAlert,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { db } from '../firebase';

export default function ProfileView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const cleanedId = id.trim();

    // Offline fallback demo profile
    if (cleanedId.toUpperCase().startsWith("APEC-DEMO") || cleanedId === 'demo') {
      setTimeout(() => {
        setProfile({
          id: 'demo-tech',
          name: 'Rahul Sharma',
          email: 'r.sharma@apecpowersolutions.com',
          role: 'Lead Grid Engineer',
          employeeId: 'APEC-2026-009',
          department: 'Grid Automation',
          status: 'Active',
          phone: '+91 94481 02941',
          joinedDate: '2025-01-15',
          avatar: 'cyan',
          skills: ['HV Substation Audit', 'LOTO Protocol', 'PLC Systems', 'Transformer Safety'],
          emergencyName: 'Priya Sharma (Spouse)',
          emergencyPhone: '+91 94481 87654',
          bloodGroup: 'B+',
          medicalConditions: 'Allergy to Penicillin'
        });
        setLoading(false);
      }, 1000);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    // Lookup by employeeId first, then fall back to direct Firestore document ID
    const qEmp = query(collection(db, 'team'), where('employeeId', '==', cleanedId));
    
    const unsub = onSnapshot(qEmp, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setProfile({ id: snapshot.docs[0].id, ...docData });
        setLoading(false);
      } else {
        // Fallback to Firestore document ID lookup
        try {
          const docRef = doc(db, 'team', cleanedId);
          onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              setProfile({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, () => {
            setProfile(null);
            setLoading(false);
          });
        } catch {
          setProfile(null);
          setLoading(false);
        }
      }
    }, () => {
      setProfile(null);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const avatarColors: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/25',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25',
    red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
    gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
  };
  const avatarClass = profile ? (avatarColors[profile.avatar || 'cyan'] || avatarColors.cyan) : '';

  return (
    <div className="min-h-screen bg-[#04060b] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Cyber Grid background */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-955/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-6 z-10"
      >
        {/* Profile Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            APEC Company ID
          </div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent pt-2">
            Employee Profile
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-ping" />
              <Activity className="w-6 h-6 text-cyan-405 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">Querying Registry...</p>
          </div>
        ) : profile ? (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            {/* STATUS HEADER BADGE */}
            <div className="text-center">
              <div className="inline-flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-green-500/5 border border-green-500/20 text-green-400 w-full shadow-[0_0_15px_rgba(34,197,94,0.05)]">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <span className="text-xs font-bold font-mono tracking-widest uppercase">✓ VERIFIED EMPLOYEE</span>
                <span className="text-[9px] text-slate-500 font-mono uppercase">APEC Power Solutions</span>
              </div>
            </div>

            {/* High-security Company ID card graphic */}
            <div className="relative w-full h-44 rounded-2xl p-4 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/40 shadow-xl flex flex-col justify-between group">
              <div className="absolute inset-0 cyber-grid opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-[8px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">APEC Company ID</h5>
                  <span className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">Digital Credential</span>
                </div>
                <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded border border-cyan-500/20 bg-cyan-950/30 text-cyan-400 font-mono tracking-wider">
                  {profile.accessRole === 'Admin' ? 'ADMIN ACCESS' : 'STAFF ACCESS'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shadow-sm shrink-0" />
                ) : (
                  <span className={`w-10 h-10 rounded-lg bg-gradient-to-br ${avatarClass} border flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0`}>
                    {profile.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-100 truncate leading-snug">{profile.name}</h4>
                  <p className="text-[9px] text-rose-400 font-bold truncate mt-0.5">{profile.role}</p>
                  <p className="text-[8px] text-slate-500 font-mono truncate">{profile.department || 'Operations'}</p>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-900 pt-2 font-mono text-[8px] text-slate-400">
                <div>
                  <span className="text-slate-600 block text-[6.5px] tracking-wider">EMPLOYEE ID</span>
                  <span className="font-bold text-cyan-400">{profile.employeeId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[6.5px] tracking-wider text-right">STATUS</span>
                  <span className="font-bold text-green-400">{profile.status || 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Core credentials info grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/65 p-4 rounded-2xl border border-slate-900 font-mono">
              <div className="space-y-1">
                <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Contact Number</span>
                <span className="text-slate-300 font-bold block">{profile.phone || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Email Address</span>
                <span className="text-slate-300 font-bold block truncate" title={profile.email}>{profile.email}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Department</span>
                <span className="text-slate-300 font-bold block truncate">{profile.department || 'Operations'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Joined Date</span>
                <span className="text-slate-300 font-bold block">
                  {profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Emergency & Health Information */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block ml-1">Emergency & Medical Info</span>
              <div className="grid grid-cols-2 gap-4 text-xs bg-rose-955/5 p-4 rounded-2xl border border-rose-500/10 font-mono">
                <div className="space-y-1">
                  <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Emergency Contact</span>
                  <span className="text-slate-205 font-bold block truncate text-slate-200">{profile.emergencyName || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Emergency Phone</span>
                  <span className="text-slate-205 font-bold block truncate text-slate-200">{profile.emergencyPhone || 'N/A'}</span>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-900/60 pt-2 mt-1 flex justify-between gap-4">
                  <div>
                    <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Blood Group</span>
                    <span className="text-rose-405 font-extrabold flex items-center gap-0.5 mt-0.5 text-rose-400">
                      🩸 {profile.bloodGroup || 'N/A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-550 text-[8.5px] uppercase tracking-wider block text-slate-500">Medical Notes</span>
                    <span className="text-slate-355 font-medium block truncate mt-0.5" title={profile.medicalConditions}>
                      {profile.medicalConditions || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Action Buttons */}
            {profile.emergencyPhone && profile.emergencyPhone !== 'N/A' && (
              <a 
                href={`tel:${profile.emergencyPhone}`}
                className="w-full py-3 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Phone className="w-4 h-4 text-rose-505 animate-pulse" />
                Call Emergency Contact
              </a>
            )}
          </div>
        ) : (
          <div className="py-10 text-center space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-550 uppercase tracking-widest font-mono text-rose-500">Verification Failed</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                No active employee credentials match ID: <span className="font-mono text-cyan-400 block mt-1 break-all bg-slate-900/60 py-1.5 px-3 rounded-lg border border-slate-800">{id}</span>
              </p>
            </div>
            <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
              Verify that the worker ID or Firestore key is correct, or register it inside the Admin Control dashboard.
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-2 border-t border-slate-900 flex justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
