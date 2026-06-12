import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Printer, 
  Search, 
  User, 
  Briefcase, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Loader2,
  Calendar,
  Award
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';

export default function IDCardGenerator() {
  const { setFirestoreError, isAdmin } = useOutletContext<any>();
  const [searchParams] = useSearchParams();
  const targetEmpId = searchParams.get('empId');

  const [teamList, setTeamList] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  // Fetch all team members from register
  useEffect(() => {
    if (!db) {
      // Fallback mockup
      const mockTeam = [
        { id: '1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', role: 'Lead Field Engineer', department: 'Solar Installation', phone: '+91 98765 43210', joinedDate: '2025-01-10', bloodGroup: 'O+', emergencyName: 'Sanjay Kumar', emergencyPhone: '+91 99887 76655', avatar: 'cyan' },
        { id: '2', name: 'Sanjay Kumar', email: 'sanjay@apecpowersolutions.com', employeeId: 'APEC-1003', role: 'Safety Compliance Officer', department: 'Safety & Compliance', phone: '+91 91234 56789', joinedDate: '2025-02-15', bloodGroup: 'A+', emergencyName: 'Rahul Sharma', emergencyPhone: '+91 98765 43210', avatar: 'gold' }
      ];
      setTeamList(mockTeam);
      setIsTeamLoading(false);
      
      // Auto select first or from search params
      const target = mockTeam.find(t => t.employeeId === targetEmpId || t.id === targetEmpId);
      if (target) {
        setSelectedEmployee(target);
        setSelectedId(target.id);
      } else if (mockTeam.length > 0) {
        setSelectedEmployee(mockTeam[0]);
        setSelectedId(mockTeam[0].id);
      }
      return;
    }

    const unsub = onSnapshot(collection(db, 'team'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamList(list);
      setIsTeamLoading(false);

      // Resolve parameter selection
      if (targetEmpId) {
        const matched = list.find((t: any) => t.employeeId === targetEmpId || t.id === targetEmpId);
        if (matched) {
          setSelectedEmployee(matched);
          setSelectedId(matched.id);
          return;
        }
      }

      if (list.length > 0 && !selectedEmployee) {
        setSelectedEmployee(list[0]);
        setSelectedId(list[0].id);
      }
    }, (err) => {
      console.error('Error loading team for ID generator:', err);
      setFirestoreError(err.code);
      setIsTeamLoading(false);
    });

    return () => unsub();
  }, [targetEmpId, setFirestoreError]);

  // Handle dropdown selection change
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matched = teamList.find(t => t.id === e.target.value);
    if (matched) {
      setSelectedEmployee(matched);
      setSelectedId(matched.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate simulated barcode lines
  const renderBarcode = () => {
    const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 2, 4, 1, 3];
    return (
      <div className="flex items-center justify-center h-8 bg-white px-3 py-1 rounded">
        {bars.map((weight, idx) => (
          <div 
            key={idx} 
            className="bg-black h-full shrink-0" 
            style={{ 
              width: `${weight}px`, 
              marginRight: idx % 3 === 0 ? '2px' : '1px' 
            }} 
          />
        ))}
      </div>
    );
  };

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
      className="space-y-6 lg:space-y-8 print:p-0 print:space-y-0"
    >
      {/* Header section (hidden on print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-2xl relative overflow-hidden print:hidden">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-cyan-400" />
            Corporate ID Card Generator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate, preview, and print standardized company identity badges directly from the employee registry
          </p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={!selectedEmployee}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Badges
        </button>
      </div>

      {/* Select Box (hidden on print) */}
      {teamList.length > 0 && (
        <div className="p-4 rounded-xl glass-card border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">Select Employee Registry Profile</label>
            <select
              value={selectedId}
              onChange={handleEmployeeChange}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 cursor-pointer text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            >
              {teamList.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                  {t.name} ({t.employeeId || 'N/A'}) · {t.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Generator Layout preview */}
      {selectedEmployee ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:grid-cols-1 print:gap-0 print:items-center">
          
          {/* Controls Panel (hidden on print) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-100 border-b border-slate-800/80 pb-2">
                Card Information Details
              </h3>
              
              <div className="space-y-3.5 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Name</span>
                  <span className="text-slate-200 font-bold text-sm">{selectedEmployee.name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Designation</span>
                  <span className="text-rose-400 font-bold">{selectedEmployee.role}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Employee ID</span>
                  <span className="text-cyan-400 font-bold">{selectedEmployee.employeeId || 'APEC-MEMBER'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Department</span>
                  <span className="text-slate-350">{selectedEmployee.department || 'Operations Control'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Blood Group</span>
                  <span className="text-rose-455 font-bold flex items-center gap-1 text-rose-400">🩸 {selectedEmployee.bloodGroup || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block uppercase tracking-wider text-[8px]">Emergency Contact</span>
                  <span className="text-slate-300 block">{selectedEmployee.emergencyName || 'N/A'}</span>
                  <span className="text-slate-500 text-[10px]">{selectedEmployee.emergencyPhone || 'N/A'}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10.5px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Verify that the profile picture and details are updated. Run modifications in the **Team Control** panel if needed.</span>
              </div>
            </div>
          </div>

          {/* ID CARD VISUAL GRAPHIC CONTAINER */}
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-8 items-center justify-center p-4 print:p-0 print:flex-col print:gap-12 print:w-full">
            
            {/* FRONT SIDE OF ID CARD */}
            <div 
              id="id-card-front"
              className="id-card-print-block w-[280px] h-[440px] rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-[#0a0f1d] to-[#0e162c] shadow-[0_12px_36px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col justify-between p-5 select-none print:shadow-none print:border-black/50"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Futuristic vector overlays */}
              <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full pointer-events-none" />
              
              {/* Header Branding */}
              <div className="flex items-center gap-2.5 z-10">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-8 h-8 object-contain bg-slate-900/60 p-0.5 rounded border border-slate-700/60"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.jpeg';
                  }}
                />
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-100 leading-tight">APEC Power Solutions</h4>
                  <p className="text-[7.5px] text-cyan-405 font-bold uppercase tracking-widest text-cyan-400 leading-none">GRID SERVICES</p>
                </div>
              </div>

              {/* Profile Avatar Frame */}
              <div className="flex flex-col items-center gap-3.5 z-10 my-auto">
                <div className="relative">
                  {/* Hexagon/Square glow border */}
                  <div className="absolute inset-0 -m-1 rounded-2xl bg-gradient-to-tr from-cyan-500 to-cyan-400 blur-sm opacity-50" />
                  
                  {selectedEmployee.photoUrl ? (
                    <img 
                      src={selectedEmployee.photoUrl} 
                      alt={selectedEmployee.name} 
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-900 shadow-xl relative z-10" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-2xl font-extrabold text-cyan-400 shadow-xl relative z-10">
                      {selectedEmployee.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-0.5">
                  <h3 className="text-sm font-black text-slate-100 tracking-wide uppercase">{selectedEmployee.name}</h3>
                  <p className="text-[9.5px] text-rose-500 font-extrabold uppercase tracking-widest leading-tight">{selectedEmployee.role}</p>
                  <p className="text-[8.5px] text-slate-500 font-mono tracking-wider">{selectedEmployee.department || 'Operations Control'}</p>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="border-t border-cyan-500/20 pt-3 flex justify-between items-end z-10 font-mono">
                <div>
                  <span className="text-slate-500 block uppercase text-[6px] tracking-wider leading-none">EMPLOYEE ID</span>
                  <span className="font-extrabold text-cyan-400 text-[10px] leading-tight">{selectedEmployee.employeeId || 'APEC-MEMBER'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block uppercase text-[6.5px] tracking-wider leading-none">Access Level</span>
                  <span className="font-bold text-slate-350 text-[7.5px] uppercase">
                    {[
                      'admin@apecpowersolutions.com',
                      'managingdirector@apecpowersolutions.com'
                    ].includes(selectedEmployee.email?.toLowerCase()) || selectedEmployee.accessRole === 'Admin' || selectedEmployee.roleType === 'Admin'
                      ? 'ADMIN SECURE'
                      : 'STAFF OPERATIONS'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* BACK SIDE OF ID CARD */}
            <div 
              id="id-card-back"
              className="id-card-print-block w-[280px] h-[440px] rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-[#0a0f1d] to-[#0e162c] shadow-[0_12px_36px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col justify-between p-5 select-none print:shadow-none print:border-black/50"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Overlay graphics */}
              <div className="absolute inset-0 cyber-grid opacity-15 pointer-events-none" />
              
              {/* Back Header */}
              <div className="space-y-1 text-center border-b border-cyan-500/20 pb-2.5">
                <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">APEC Power Solutions</h5>
                <p className="text-[6.5px] text-slate-500 font-mono">ISO 9001:2015 Operations Control System</p>
              </div>

              {/* Emergency & Corporate Details */}
              <div className="space-y-3.5 my-auto">
                
                {/* Emergency Block */}
                <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl font-mono text-[9px] space-y-1">
                  <span className="font-bold text-rose-500 block text-[7px] uppercase tracking-wider">Emergency & Medical Information</span>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Contact Person:</span>
                    <span className="font-bold text-slate-200">{selectedEmployee.emergencyName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Emergency Phone:</span>
                    <span className="font-bold text-slate-200">{selectedEmployee.emergencyPhone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Blood Group:</span>
                    <span className="font-bold text-rose-455 text-rose-400 flex items-center gap-0.5">🩸 {selectedEmployee.bloodGroup || 'N/A'}</span>
                  </div>
                </div>

                {/* Office Info Block */}
                <div className="space-y-1 font-mono text-[8px] text-slate-500 leading-normal">
                  <span className="font-bold text-slate-400 block text-[6.5px] uppercase tracking-wider">APEC Corporate Registry Office</span>
                  <p>Hubli Substation Grid Ops Center, Koppal Wind Farm & Dharwad Solar Installation Hubs.</p>
                  <p>Contact: ops@apecpowersolutions.com</p>
                </div>

                {/* Instructions / Notice */}
                <div className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl text-center text-[7.5px] text-slate-500 leading-relaxed uppercase">
                  This card is the corporate property of APEC Power Solutions. If found, please return to the nearest grid services office address.
                </div>
              </div>

              {/* Barcode & Signature Block */}
              <div className="space-y-3 pt-3 border-t border-cyan-500/20">
                <div className="flex justify-between items-center text-[6.5px] font-mono text-slate-550 uppercase">
                  <span>Authorized Signature</span>
                  <span>APEC Verification Code</span>
                </div>
                <div className="flex justify-between items-end gap-4">
                  <div className="border-b border-slate-700 w-24 h-6 flex items-center justify-center italic text-[9px] text-slate-500 select-none">
                    Pradeep Mathi
                  </div>
                  <div className="shrink-0 flex flex-col items-center">
                    {renderBarcode()}
                    <span className="text-[7px] font-mono text-slate-500 mt-1 select-none">*{selectedEmployee.employeeId || selectedEmployee.id}*</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-card border border-white/10 rounded-2xl py-20 text-center flex flex-col items-center shadow-[0_8px_30px_rgba(0,0,0,0.3)] print:hidden">
          <User className="w-14 h-14 text-slate-700 mb-3" />
          <p className="text-sm font-medium text-slate-400">No profile selected to generate ID Card</p>
          <p className="text-xs text-slate-505 mt-1">Please select an employee profile or update team registry.</p>
        </div>
      )}

      {/* Styled Printable media CSS (scopings to standard CR80 printable card scale) */}
      <style>{`
        @media print {
          /* Hide all general web wrappers */
          body * {
            visibility: hidden;
          }
          
          /* Show only selected ID Card print blocks */
          .id-card-print-block, .id-card-print-block * {
            visibility: visible;
          }
          
          /* Set custom print page configurations */
          @page {
            size: portrait;
            margin: 0;
          }
          
          body {
            background-color: transparent !important;
            background-image: none !important;
          }
          
          /* Center cards nicely on print canvas */
          #id-card-front {
            position: absolute !important;
            left: 50% !important;
            top: 10% !important;
            transform: translateX(-50%) !important;
            page-break-after: always !important;
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            background: #070a13 !important;
            color: #fff !important;
          }
          
          #id-card-back {
            position: absolute !important;
            left: 50% !important;
            top: 10% !important;
            transform: translateX(-50%) !important;
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            background: #070a13 !important;
            color: #fff !important;
          }
        }
      `}</style>

    </motion.div>
  );
}
