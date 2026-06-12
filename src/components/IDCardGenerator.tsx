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
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-8 items-center justify-center p-4 print:p-0 print:flex-col print:gap-0 print:w-full id-card-print-container">
            
            {/* FRONT SIDE OF ID CARD */}
            <div 
              id="id-card-front"
              className="id-card-print-block w-[280px] h-[440px] rounded-lg border border-slate-350 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-row select-none print:shadow-none print:border-black/50 font-poppins"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Left Side (White Grid Background) */}
              <div className="w-[218px] h-full card-grid-bg relative flex flex-col justify-between p-4 z-10">
                {/* Branding Header */}
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo.png" 
                    alt="APEC Logo" 
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.jpeg';
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-[900] text-black leading-none tracking-tight">APEC</span>
                    <span className="text-[9px] font-bold text-[#c91c1c] leading-none tracking-tight">Power Solutions</span>
                  </div>
                </div>

                {/* Profile Photo Frame */}
                <div className="flex flex-col items-center mt-2">
                  <div className="w-[105px] h-[125px] border-[3px] border-[#c91c1c] bg-white overflow-hidden shadow-sm flex items-center justify-center">
                    {selectedEmployee.photoUrl ? (
                      <img 
                        src={selectedEmployee.photoUrl} 
                        alt={selectedEmployee.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
                        {selectedEmployee.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Employee Name */}
                <div className="flex flex-col items-center mt-2.5">
                  <h3 className="text-[17px] font-black text-[#0b2265] text-center tracking-wide leading-tight">
                    {selectedEmployee.name}
                  </h3>
                </div>

                {/* Details List */}
                <div className="w-full px-1.5 mt-2.5 text-[9.5px] text-slate-800 space-y-1.5">
                  <div className="grid grid-cols-[38px_4px_1fr] gap-x-1 items-start">
                    <span className="font-extrabold text-black">ID No</span>
                    <span className="font-bold text-black">:</span>
                    <span className="font-extrabold text-[#c91c1c] tracking-tight">{selectedEmployee.employeeId || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-[38px_4px_1fr] gap-x-1 items-start">
                    <span className="font-extrabold text-black">Email</span>
                    <span className="font-bold text-black">:</span>
                    <span className="break-all font-bold text-slate-850 leading-tight">{selectedEmployee.email || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-[38px_4px_1fr] gap-x-1 items-start">
                    <span className="font-extrabold text-black">Phone</span>
                    <span className="font-bold text-black">:</span>
                    <span className="font-bold text-slate-850">{selectedEmployee.phone || 'N/A'}</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex justify-center items-center mt-3">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`ID:${selectedEmployee.employeeId || selectedEmployee.id}\nName:${selectedEmployee.name}\nEmail:${selectedEmployee.email}\nPhone:${selectedEmployee.phone}`)}`} 
                    alt="QR Code"
                    className="w-[52px] h-[52px] object-contain"
                  />
                </div>

                {/* Bottom Left Accent Squares */}
                <div style={{ position: 'absolute', bottom: '0px', left: '0px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '14px', left: '14px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
              </div>

              {/* Right Side (Solid Red Column) */}
              <div className="w-[62px] h-full bg-[#c91c1c] flex items-center justify-center relative overflow-hidden select-none">
                <div className="text-white font-[900] text-sm uppercase whitespace-nowrap tracking-[0.3em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  {selectedEmployee.role}
                </div>
              </div>
            </div>

            {/* BACK SIDE OF ID CARD */}
            <div 
              id="id-card-back"
              className="id-card-print-block w-[280px] h-[440px] rounded-lg border border-slate-350 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-row select-none print:shadow-none print:border-black/50 font-canva"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Left Side (Solid Red Column) */}
              <div className="w-[62px] h-full bg-[#c91c1c] relative z-10" />

              {/* Right Side (White Grid Background) */}
              <div className="w-[218px] h-full card-grid-bg relative flex flex-col justify-between items-center p-4 z-10">
                {/* Header Logo */}
                <div className="flex flex-col items-center mt-1">
                  <img 
                    src="/logo.png" 
                    alt="APEC Logo" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.jpeg';
                    }}
                  />
                  <div className="flex flex-col items-center mt-0.5">
                    <span className="text-[12px] font-[900] text-black leading-none tracking-tight">APEC</span>
                    <span className="text-[9px] font-bold text-[#c91c1c] leading-none tracking-tight">Power Solutions</span>
                  </div>
                </div>

                {/* Terms and Conditions Title */}
                <h5 className="text-[11px] font-black text-black tracking-wider text-center mt-4">TERMS & CONDITIONS</h5>

                {/* Subtext */}
                <p className="text-[7.5px] font-extrabold text-slate-800 text-center mt-1 px-1.5 leading-snug">
                  Security: If the ID is found anywhere please send to
                </p>

                {/* Address Block */}
                <div className="text-[7.5px] font-extrabold text-slate-850 text-center mt-2.5 px-3 leading-normal">
                  APEC Power Solutions Pvt Ltd<br/>
                  59A-21/3-3A, 2,<br/>
                  DON BOSCO SCHOOL ROAD,<br/>
                  VIJAYANAGAR COLONY,<br/>
                  Patamata,<br/>
                  Vijayawada,<br/>
                  Andhra Pradesh 520010
                </div>

                {/* Bottom QR Code */}
                <div className="flex justify-center items-center mt-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`APEC Power Solutions Pvt Ltd\n59A-21/3-3A, 2, DON BOSCO SCHOOL ROAD, VIJAYANAGAR COLONY, Patamata, Vijayawada, Andhra Pradesh 520010`)}`} 
                    alt="QR Code"
                    className="w-[52px] h-[52px] object-contain"
                  />
                </div>

                {/* Corner Red Accent Squares (Top Right & Bottom Right) */}
                {/* Top Right Corner Accent */}
                <div style={{ position: 'absolute', top: '0px', right: '0px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', top: '14px', right: '14px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />

                {/* Bottom Right Corner Accent (Step-stair L-shape Pattern) */}
                <div style={{ position: 'absolute', bottom: '0px', right: '0px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '0px', right: '14px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '14px', right: '0px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '0px', right: '28px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
                <div style={{ position: 'absolute', bottom: '28px', right: '0px', width: '14px', height: '14px', backgroundColor: '#c91c1c' }} />
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

      {/* Styled Printable media CSS */}
      <style>{`
        .card-grid-bg {
          background-color: #ffffff;
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 14px 14px;
        }

        @media print {
          /* Hide all general web wrappers */
          body * {
            visibility: hidden;
          }
          
          /* Show only selected ID Card print blocks and container */
          .id-card-print-container, .id-card-print-container * {
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
          
          /* Positioning cards nicely on print canvas */
          .id-card-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding-top: 40px !important;
            gap: 40px !important;
          }

          .id-card-print-block {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </motion.div>
  );
}
