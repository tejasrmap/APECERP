import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Shield,
  ArrowLeft,
  MapPin,
  HeartPulse,
  User,
  BadgeCheck
} from 'lucide-react';
import { db } from '../firebase';

export default function ProfileView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const cleanedId = id.trim();

    if (cleanedId.toUpperCase().startsWith('APEC-DEMO') || cleanedId === 'demo') {
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
          accessRole: 'User',
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
      setError("Firebase Firestore is not initialized. Please verify that your environment variables (VITE_FIREBASE_*) are configured correctly.");
      setLoading(false);
      return;
    }

    setError(null);
    let unsubDoc: (() => void) | null = null;

    // Fetch via employeeId query first
    const qEmp = query(collection(db, 'team'), where('employeeId', '==', cleanedId));
    const unsubQuery = onSnapshot(qEmp, (snapshot) => {
      if (!snapshot.empty) {
        setProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        setLoading(false);
      } else {
        // Fallback to doc ID lookup
        try {
          const docRef = doc(db, 'team', cleanedId);
          unsubDoc = onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              setProfile({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (docErr) => {
            console.error("Direct doc ID fetch error:", docErr);
            setProfile(null);
            setLoading(false);
          });
        } catch (err) {
          console.error("Direct doc ID fetch catch block error:", err);
          setProfile(null);
          setLoading(false);
        }
      }
    }, (queryErr) => {
      console.error("Query by employeeId failed:", queryErr);
      setError(`Firestore Query Error: ${queryErr.message || queryErr.code || queryErr}`);
      
      // Fallback to direct doc ID lookup in case of query permission-denied
      try {
        console.log("Attempting direct doc ID lookup fallback for ID:", cleanedId);
        const docRef = doc(db, 'team', cleanedId);
        unsubDoc = onSnapshot(docRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setProfile({ id: docSnapshot.id, ...docSnapshot.data() });
            setError(null); // Clear query error since fallback succeeded
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (docErr) => {
          console.error("Fallback direct doc ID fetch error:", docErr);
          setError(`Query failed: ${queryErr.message}. Fallback doc fetch failed: ${docErr.message}`);
          setProfile(null);
          setLoading(false);
        });
      } catch (err: any) {
        console.error("Fallback direct doc ID fetch catch block error:", err);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubQuery();
      if (unsubDoc) unsubDoc();
    };
  }, [id]);

  const isAdmin = profile?.accessRole === 'Admin' || profile?.roleType === 'Admin' || [
    'admin@apecpowersolutions.com',
    'managingdirector@apecpowersolutions.com'
  ].includes(profile?.email?.toLowerCase());

  const avatarGradients: Record<string, string> = {
    cyan: 'from-cyan-500 to-cyan-700',
    blue: 'from-blue-500 to-blue-700',
    red: 'from-rose-500 to-rose-700',
    gold: 'from-amber-400 to-amber-600',
  };
  const avatarGrad = profile ? (avatarGradients[profile.avatar || 'cyan'] || avatarGradients.cyan) : avatarGradients.cyan;

  const statusColor =
    profile?.status === 'Active' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
    profile?.status === 'Site Visit' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' :
    'bg-amber-500/15 text-amber-400 border-amber-500/30';

  return (
    <div className="min-h-screen bg-[#04060b] text-slate-100 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 cyber-grid opacity-[0.04] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] rounded-full bg-cyan-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[40vh] rounded-full bg-rose-500/4 blur-[120px] pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-slate-100">APEC <span className="text-cyan-400">ERP</span></span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Employee Identity Portal</span>
        <Link to="/" className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors font-mono uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" />
          Portal
        </Link>
      </div>

      {/* ─── LOADING STATE ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border border-cyan-500/50 animate-ping" style={{ animationDelay: '0.2s' }} />
            <Activity className="absolute inset-0 m-auto w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase">Querying Registry...</p>
        </div>
      )}

      {/* ─── NOT FOUND ─── */}
      {!loading && !profile && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4 py-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-400 uppercase tracking-widest font-mono">Profile Not Found</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                No employee record matches ID:
              </p>
              <span className="inline-block mt-2 font-mono text-cyan-400 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 break-all">{id}</span>
            </div>

            {error && (
              <div className="mt-2 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-left max-w-md">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-bold block mb-1">Database Diagnostic Alert</span>
                <p className="text-[11px] text-slate-400 leading-normal mb-3 font-mono break-words">
                  {error}
                </p>
                <div className="text-[10px] text-slate-400 leading-relaxed border-t border-rose-500/10 pt-2.5 font-sans">
                  💡 <span className="font-semibold text-slate-200">Tip for Administrator:</span> If this is a <code>permission-denied</code> error, ensure your Firestore Security Rules allow public read access on the <code>team</code> collection. Example rule:
                  <pre className="mt-1.5 p-2 bg-black/40 border border-white/5 rounded text-[9px] font-mono text-cyan-400 overflow-x-auto select-all">
{`match /team/{memberId} {
  allow read: if true;
  allow write: if request.auth != null;
}`}
                  </pre>
                </div>
              </div>
            )}

            <Link to="/" className="mt-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 text-xs font-bold transition-all flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Portal
            </Link>
          </motion.div>
        </div>
      )}

      {/* ─── PROFILE ─── */}
      {!loading && profile && (
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-5">

          {/* ── HERO CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          >
            {/* Hero gradient banner */}
            <div className="h-28 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 relative">
              <div className="absolute inset-0 cyber-grid opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#06090f]" />
              {/* Verified badge top right */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/25 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[9px] font-extrabold text-green-400 uppercase tracking-widest font-mono">Verified</span>
              </div>
              {/* Company label top left */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">APEC Power Solutions</span>
              </div>
            </div>

            {/* Profile info area */}
            <div className="bg-[#06090f] px-6 pb-6">
              {/* Avatar — overlapping the banner */}
              <div className="flex items-end gap-5 -mt-12 mb-4">
                <div className="relative shrink-0">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-[#06090f] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
                    />
                  ) : (
                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${avatarGrad} border-4 border-[#06090f] flex items-center justify-center text-2xl font-extrabold text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)]`}>
                      {profile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* Online dot */}
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#06090f] ${profile.status === 'Active' ? 'bg-green-400' : profile.status === 'Site Visit' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                </div>
                <div className="mb-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-extrabold text-white leading-tight" style={{ color: '#ffffff' }}>{profile.name}</h1>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[9px] font-extrabold uppercase tracking-widest">
                        <BadgeCheck className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-rose-400 font-bold mt-0.5">{profile.role || 'Staff Member'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400 font-mono">{profile.department || 'Operations'}</span>
                  </div>
                </div>
              </div>

              {/* Employee ID + Status row */}
              <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Employee ID</span>
                  <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded-lg">{profile.employeeId || 'APEC-MEMBER'}</span>
                </div>
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${statusColor}`}>
                  {profile.status || 'Active'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── INFO GRID ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { icon: Phone, label: 'Phone', value: profile.phone || 'N/A', color: 'text-cyan-400' },
              { icon: Mail, label: 'Email', value: profile.email || 'N/A', color: 'text-cyan-400', truncate: true },
              { icon: Briefcase, label: 'Department', value: profile.department || 'Operations', color: 'text-slate-300' },
              { icon: Calendar, label: 'Joined', value: profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', color: 'text-slate-300' },
            ].map(({ icon: Icon, label, value, color, truncate }) => (
              <div key={label} className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-1.5 hover:border-cyan-500/15 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-xs font-bold ${color} ${truncate ? 'truncate' : ''}`} title={value}>{value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── SKILLS ── */}
          {profile.skills && profile.skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Skills & Certifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-semibold flex items-center gap-1.5 hover:border-cyan-500/25 hover:text-cyan-400 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── EMERGENCY CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl overflow-hidden border border-rose-500/15 shadow-[0_0_30px_rgba(239,68,68,0.04)]"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/5 border-b border-rose-500/10">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">Emergency & Medical</span>
            </div>
            <div className="bg-slate-950/60 p-4 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono block">Emergency Contact</span>
                <span className="text-sm font-bold text-slate-100">{profile.emergencyName || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono block">Emergency Phone</span>
                <span className="text-sm font-bold text-slate-100">{profile.emergencyPhone || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono block">Blood Group</span>
                <span className="text-sm font-extrabold text-rose-400 flex items-center gap-1">🩸 {profile.bloodGroup || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono block">Medical Notes</span>
                <span className="text-xs font-medium text-slate-300 leading-snug">{profile.medicalConditions || 'None'}</span>
              </div>
            </div>
          </motion.div>

          {/* ── EMERGENCY CALL BUTTON ── */}
          {profile.emergencyPhone && profile.emergencyPhone !== 'N/A' && (
            <motion.a
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              href={`tel:${profile.emergencyPhone}`}
              className="flex w-full items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 font-bold text-sm transition-all shadow-[0_4px_20px_rgba(239,68,68,0.08)] hover:shadow-[0_4px_20px_rgba(239,68,68,0.18)] active:scale-[0.98]"
            >
              <Phone className="w-4 h-4 animate-pulse" />
              Call Emergency Contact
            </motion.a>
          )}

          {/* ── FOOTER ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center justify-between pt-2 pb-4"
          >
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-600" />
              <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">APEC Company ID · {profile.employeeId}</span>
            </div>
            <Link to="/" className="inline-flex items-center gap-1 text-[9px] text-slate-600 hover:text-cyan-400 transition-colors font-mono uppercase tracking-wider">
              <ArrowLeft className="w-3 h-3" /> Portal
            </Link>
          </motion.div>

        </div>
      )}
    </div>
  );
}
