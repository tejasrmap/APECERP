import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  Paperclip, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Eye,
  FileCheck
} from 'lucide-react';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { supabase } from '../supabase';
import ImageViewerModal from './ImageViewerModal';
import PDFViewerModal from './PDFViewerModal';

interface DailyReport {
  id: string;
  date: string;
  projectId: string;
  projectName: string;
  tasksCompleted: string;
  tasksInProgress: string;
  challenges?: string;
  materialsUsed?: string;
  hoursWorked: number;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  technicianId: string;
  technicianName: string;
  technicianEmail: string;
  submittedByAdmin?: boolean;
  submitterEmail?: string;
  timestamp: string;
}

export default function DailyReports() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading, isAdmin, userProfile } = useOutletContext<any>();

  // Page States
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitMode, setIsSubmitMode] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Form States
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [hoursWorked, setHoursWorked] = useState<string>('8');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [tasksInProgress, setTasksInProgress] = useState('');
  const [challenges, setChallenges] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');

  // File Upload States
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters State
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDateStr, setEndDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [techFilter, setTechFilter] = useState('All');

  // Preview / Print States
  const [activeDetailReport, setActiveDetailReport] = useState<DailyReport | null>(null);
  const [activePrintReport, setActivePrintReport] = useState<DailyReport | null>(null);
  const [printMode, setPrintMode] = useState<'stationery' | 'digital'>('digital');
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);

  // Current logged in user info
  const activeEmail = userProfile?.email || auth?.currentUser?.email || 'admin@apecpowersolutions.com';
  const activeName = userProfile?.name || auth?.currentUser?.displayName || 'Admin User';
  const activeEmpId = userProfile?.employeeId || 'APEC-0001';

  // 1. Listen to Team Members (Admins can select anyone)
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com', employeeId: 'APEC-1002', role: 'Lead Electrician' },
        { id: '2', name: 'Sanjay Kumar', email: 'sanjay@apecpowersolutions.com', employeeId: 'APEC-1003', role: 'Safety Engineer' }
      ]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'team'), (snap) => {
      setTeamList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Set default technician for the form (non-admins default to themselves)
  useEffect(() => {
    if (!isAdmin && teamList.length > 0) {
      const matched = teamList.find(t => t.email?.toLowerCase() === activeEmail.toLowerCase());
      if (matched) {
        setSelectedTechnician(matched);
      } else {
        setSelectedTechnician({
          id: 'current',
          name: activeName,
          email: activeEmail,
          employeeId: activeEmpId,
          role: 'Staff Member'
        });
      }
    } else if (isAdmin && !selectedTechnician && teamList.length > 0) {
      // Admins default to themselves as the first option, or the first list option
      const matched = teamList.find(t => t.email?.toLowerCase() === activeEmail.toLowerCase());
      setSelectedTechnician(matched || teamList[0]);
    }
  }, [teamList, isAdmin, activeEmail]);

  // 2. Listen to Projects List
  useEffect(() => {
    if (!db) {
      setProjectsList([
        { id: 'proj-1', name: 'Grid Substation Hubli', site: 'Hubli Substation' },
        { id: 'proj-2', name: 'Koppal Wind Farm', site: 'Koppal Wind Farm' },
        { id: 'proj-3', name: 'Dharwad Solar Hub', site: 'Dharwad Solar Hub' }
      ]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      const projs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectsList(projs);
      if (projs.length > 0) {
        setSelectedProject(projs[0]);
      }
    });
    return () => unsub();
  }, []);

  // 3. Listen to Daily Reports
  useEffect(() => {
    if (!db) {
      setIsFallbackMode(true);
      const local = JSON.parse(localStorage.getItem('apec_daily_reports') || '[]');
      setReports(local);
      setLoading(false);
      return;
    }

    setIsFallbackMode(false);
    const unsub = onSnapshot(collection(db, 'daily_reports'), (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        let tsString = new Date().toISOString();
        if (data.timestamp) {
          if (data.timestamp.toDate) tsString = data.timestamp.toDate().toISOString();
          else if (data.timestamp.seconds) tsString = new Date(data.timestamp.seconds * 1000).toISOString();
        }
        return {
          id: doc.id,
          ...data,
          timestamp: tsString
        } as DailyReport;
      });
      // Sort desc by date, then by timestamp
      list.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
      setReports(list);
      setLoading(false);
    }, (err) => {
      console.error('Daily reports listener error:', err);
      setIsFallbackMode(true);
      const local = JSON.parse(localStorage.getItem('apec_daily_reports') || '[]');
      setReports(local);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // File preview logic
  useEffect(() => {
    if (!attachedFile) {
      setFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(attachedFile);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const uploadReportAttachment = async (file: File, empId: string): Promise<{ url: string; name: string; type: string }> => {
    if (supabase) {
      try {
        const path = `daily-reports/${empId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('APECERP')
          .upload(path, file, { cacheControl: '3600', upsert: true });

        if (!error) {
          const { data } = supabase.storage.from('APECERP').getPublicUrl(path);
          return { url: data.publicUrl, name: file.name, type: file.type };
        } else {
          console.warn('Supabase storage upload failed, falling back to base64:', error);
        }
      } catch (err) {
        console.error('Error uploading file to Supabase:', err);
      }
    }

    // Fallback: Convert to Base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result as string,
          name: file.name,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedTechnician) {
      alert('Please select a project and technician.');
      return;
    }

    setIsDbActionLoading(true);
    try {
      let attachmentInfo: any = {};
      if (attachedFile) {
        attachmentInfo = await uploadReportAttachment(attachedFile, selectedTechnician.employeeId || selectedTechnician.id);
      }

      const payload: Omit<DailyReport, 'id'> = {
        date: reportDate,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        tasksCompleted: tasksCompleted.trim(),
        tasksInProgress: tasksInProgress.trim(),
        challenges: challenges.trim() || undefined,
        materialsUsed: materialsUsed.trim() || undefined,
        hoursWorked: parseFloat(hoursWorked) || 8,
        technicianId: selectedTechnician.employeeId || selectedTechnician.id || 'APEC-MEMBER',
        technicianName: selectedTechnician.name,
        technicianEmail: selectedTechnician.email || '',
        submittedByAdmin: isAdmin,
        submitterEmail: activeEmail,
        timestamp: new Date().toISOString(),
        ...(attachmentInfo.url ? {
          attachmentUrl: attachmentInfo.url,
          attachmentName: attachmentInfo.name,
          attachmentType: attachmentInfo.type
        } : {})
      };

      if (db && !isFallbackMode) {
        await addDoc(collection(db, 'daily_reports'), {
          ...payload,
          timestamp: Timestamp.fromDate(new Date())
        });

        // Add to activities feed
        await addDoc(collection(db, 'activities'), {
          title: `Daily Report Submitted`,
          desc: `Report for project "${payload.projectName}" submitted by ${payload.technicianName} (${payload.hoursWorked} hrs)`,
          type: 'task',
          timestamp: Timestamp.fromDate(new Date())
        });
      } else {
        const local = JSON.parse(localStorage.getItem('apec_daily_reports') || '[]');
        const mockDoc = { id: `local-${Date.now()}`, ...payload };
        local.unshift(mockDoc);
        localStorage.setItem('apec_daily_reports', JSON.stringify(local));
        setReports(local);
      }

      // Reset form
      setTasksCompleted('');
      setTasksInProgress('');
      setChallenges('');
      setMaterialsUsed('');
      setAttachedFile(null);
      setHoursWorked('8');
      setIsSubmitMode(false);
    } catch (err) {
      console.error('Error submitting daily report:', err);
      alert('Failed to submit report. Please check configuration.');
    } finally {
      setIsDbActionLoading(false);
    }
  };

  // Filter list
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Role-based view limit
      if (!isAdmin && r.technicianEmail?.toLowerCase() !== activeEmail.toLowerCase()) {
        return false;
      }

      // 2. Date Range
      const isWithinDates = r.date >= startDateStr && r.date <= endDateStr;
      if (!isWithinDates) return false;

      // 3. Project filter
      if (projectFilter !== 'All' && r.projectId !== projectFilter) return false;

      // 4. Technician filter (Admin only)
      if (isAdmin && techFilter !== 'All' && r.technicianId !== techFilter) return false;

      // 5. Search text match
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        r.technicianName.toLowerCase().includes(query) ||
        r.projectName.toLowerCase().includes(query) ||
        r.tasksCompleted.toLowerCase().includes(query) ||
        (r.challenges && r.challenges.toLowerCase().includes(query));

      return matchesSearch;
    });
  }, [reports, isAdmin, activeEmail, startDateStr, endDateStr, projectFilter, techFilter, searchTerm]);

  // Export to CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Date,Technician Name,Technician ID,Project Site,Hours Worked,Tasks Completed,Next Tasks,Challenges,Materials Used,Submitted By\n';

    filteredReports.forEach(r => {
      const cleanTasks = (r.tasksCompleted || '').replace(/"/g, '""');
      const cleanNext = (r.tasksInProgress || '').replace(/"/g, '""');
      const cleanChallenges = (r.challenges || '').replace(/"/g, '""');
      const cleanMaterials = (r.materialsUsed || '').replace(/"/g, '""');
      const submitter = r.submittedByAdmin ? `Admin on behalf of ${r.technicianName}` : r.technicianName;
      csv += `"${r.date}","${r.technicianName}","${r.technicianId}","${r.projectName}",${r.hoursWorked},"${cleanTasks}","${cleanNext}","${cleanChallenges}","${cleanMaterials}","${submitter}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APEC_Daily_Reports_${startDateStr}_to_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable layout trigger
  const triggerPrint = (mode: 'stationery' | 'digital', report: DailyReport) => {
    setPrintMode(mode);
    setActivePrintReport(report);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Word Document download trigger
  const triggerDownloadDoc = (mode: 'stationery' | 'digital', report: DailyReport) => {
    const headerHtml = mode === 'digital' ? `
      <table width="100%" style="font-family: sans-serif; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td align="left" valign="top" style="width: 80px;">
            <img src="${window.location.origin}/logo.png" width="70" height="70" style="object-fit: contain;" />
          </td>
          <td align="right" valign="top">
            <div style="background-color: #A81F25; color: white; padding: 12px; border-radius: 6px; text-align: right; width: 340px; font-size: 10px; line-height: 1.4; font-family: Arial, sans-serif;">
              <b>59A-21/3-3A/2, Don Bosco School Road, Vijayanagar Colony,</b><br/>
              Patamata, Vijayawada, Pin: 520 010, NTR District, A.P.<br/>
              <span style="font-weight: bold;">CIN: U31904AP2021PTC120378 &nbsp; GST: 37AAWCA2899Q1ZB</span>
            </div>
          </td>
        </tr>
      </table>
    ` : `
      <div style="height: 180px;">&nbsp;</div>
    `;

    const footerHtml = mode === 'digital' ? `
      <hr style="border: none; border-top: 2px solid #A81F25; margin-top: 40px;" />
      <table width="100%" style="font-family: sans-serif; font-size: 10px; color: #333; margin-top: 8px; text-align: center;">
        <tr>
          <td>
            <b>B.O.:</b> H.No.3-1-679, Vavilalapally, Karimnagar, Telangana State - 505 001.<br/>
            <b>Phone:</b> +91 8499903275 &nbsp;|&nbsp; <b>Email:</b> apecprojects375@gmail.com
          </td>
        </tr>
      </table>
    ` : `
      <div style="height: 80px;">&nbsp;</div>
    `;

    const bodyHtml = `
      <h2 style="text-align: center; font-family: Arial, sans-serif; color: #111; margin-bottom: 25px; font-size: 16px;">DAILY PROGRESS REPORT</h2>
      
      <table width="100%" style="font-family: Arial, sans-serif; font-size: 11px; border-collapse: collapse; margin-bottom: 25px;" border="1" bordercolor="#dddddd" cellpadding="8">
        <tr bgcolor="#f9f9f9">
          <td width="25%"><b>Report Date</b></td>
          <td width="25%">${report.date}</td>
          <td width="25%"><b>Project Site</b></td>
          <td width="25%">${report.projectName}</td>
        </tr>
        <tr>
          <td><b>Employee Name</b></td>
          <td>${report.technicianName}</td>
          <td><b>Employee ID</b></td>
          <td>${report.technicianId}</td>
        </tr>
        <tr bgcolor="#f9f9f9">
          <td><b>Email Address</b></td>
          <td>${report.technicianEmail}</td>
          <td><b>Hours Worked</b></td>
          <td>${report.hoursWorked} hrs</td>
        </tr>
      </table>

      <div style="font-family: Arial, sans-serif; font-size: 11.5px; line-height: 1.6;">
        <h3 style="border-bottom: 1.5px solid #A81F25; padding-bottom: 4px; color: #111; font-size: 12px; margin-top: 20px;">1. Tasks Completed Today</h3>
        <p style="white-space: pre-wrap; margin-left: 5px; color: #222;">${report.tasksCompleted.replace(/\n/g, '<br/>')}</p>

        <h3 style="border-bottom: 1.5px solid #A81F25; padding-bottom: 4px; color: #111; font-size: 12px; margin-top: 20px;">2. Next Tasks / Future Plan</h3>
        <p style="white-space: pre-wrap; margin-left: 5px; color: #222;">${report.tasksInProgress.replace(/\n/g, '<br/>')}</p>

        ${report.challenges ? `
        <h3 style="border-bottom: 1.5px solid #A81F25; padding-bottom: 4px; color: #111; font-size: 12px; margin-top: 20px;">3. Challenges / Impediments Faced</h3>
        <p style="white-space: pre-wrap; margin-left: 5px; color: #222;">${report.challenges.replace(/\n/g, '<br/>')}</p>
        ` : ''}

        ${report.materialsUsed ? `
        <h3 style="border-bottom: 1.5px solid #A81F25; padding-bottom: 4px; color: #111; font-size: 12px; margin-top: 20px;">4. Materials / Tools Used</h3>
        <p style="white-space: pre-wrap; margin-left: 5px; color: #222;">${report.materialsUsed.replace(/\n/g, '<br/>')}</p>
        ` : ''}
      </div>

      <table width="100%" style="font-family: Arial, sans-serif; font-size: 11px; margin-top: 70px; border-collapse: collapse;">
        <tr>
          <td width="50%" align="left" valign="bottom">
            <br/><br/><br/>
            _______________________________<br/>
            <span style="font-weight: bold; color: #333;">Technician Signature</span>
          </td>
          <td width="50%" align="right" valign="bottom">
            <br/><br/><br/>
            _______________________________<br/>
            <span style="font-weight: bold; color: #333;">Authorized Sign / Seal</span>
          </td>
        </tr>
      </table>
    `;

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>APEC Daily Progress Report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4;
            margin: 0.5in 0.5in 0.5in 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${bodyHtml}
        ${footerHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APEC_Daily_Report_${report.date}_${report.technicianName.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 print:bg-white print:text-black print:p-0">
      
      {/* ── PRINT-ONLY STYLING & INTERFACE ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          /* Hide absolute layout nodes */
          aside, header, nav, button, input, select, textarea, .print\\:hidden, #root > div > main > header, #root > div > aside {
            display: none !important;
          }
          #root > div > main {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .print-area-wrapper {
            display: block !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
          }
        }
      `}} />

      {/* ── ACTUAL DYNAMIC PRINT COMPONENT (ONLY VISIBLE ON PRINT) ── */}
      {activePrintReport && (
        <div className="hidden print:block print-area-wrapper w-full bg-white text-black font-sans">
          
          {/* Header block conditional on print mode */}
          {printMode === 'digital' ? (
            <div className="flex justify-between items-start border-b-2 border-[#A81F25] pb-4 mb-6">
              <div className="w-20 h-20 bg-white flex items-center justify-center overflow-hidden border border-slate-200 p-0.5">
                <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain" onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }} />
              </div>
              <div className="bg-[#A81F25] text-white p-3 rounded-lg text-right max-w-sm text-[10px] leading-tight font-sans">
                <p className="font-bold">59A-21/3-3A/2, Don Bosco School Road, Vijayanagar Colony,</p>
                <p>Patamata, Vijayawada, Pin: 520 010, NTR District, A.P.</p>
                <p className="mt-1 font-semibold text-[9.5px]">CIN: U31904AP2021PTC120378 &nbsp; GST: 37AAWCA2899Q1ZB</p>
              </div>
            </div>
          ) : (
            // Leaving blank space of exactly 2.5 inches for physical stationery paper
            <div style={{ height: '2.3in' }} className="w-full" />
          )}

          {/* Title and Metadata */}
          <div className="space-y-6">
            <h2 className="text-center font-bold text-lg text-slate-900 border-b border-slate-300 pb-2 uppercase tracking-wide">
              Daily Progress Report
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-slate-500 font-semibold">Report Date:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{activePrintReport.date}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Project Site:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{activePrintReport.projectName}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Technician Name:</p>
                <p className="font-bold text-slate-800 mt-0.5">{activePrintReport.technicianName} ({activePrintReport.technicianId})</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Hours Logged:</p>
                <p className="font-bold text-slate-800 mt-0.5">{activePrintReport.hoursWorked} hrs</p>
              </div>
            </div>

            {/* Content areas */}
            <div className="space-y-5 text-[12.5px] leading-relaxed text-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-sm">1. Tasks Completed Today</h3>
                <p className="mt-2 whitespace-pre-wrap pl-1 font-medium">{activePrintReport.tasksCompleted}</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-sm">2. Next Tasks / Future Plan</h3>
                <p className="mt-2 whitespace-pre-wrap pl-1 font-medium">{activePrintReport.tasksInProgress}</p>
              </div>

              {activePrintReport.challenges && (
                <div>
                  <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-sm">3. Challenges / Impediments Faced</h3>
                  <p className="mt-2 whitespace-pre-wrap pl-1 font-medium">{activePrintReport.challenges}</p>
                </div>
              )}

              {activePrintReport.materialsUsed && (
                <div>
                  <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-sm">4. Materials & Tools Used</h3>
                  <p className="mt-2 whitespace-pre-wrap pl-1 font-medium">{activePrintReport.materialsUsed}</p>
                </div>
              )}
            </div>

            {/* Signature Rows */}
            <div className="flex justify-between items-end pt-16 text-xs text-slate-700">
              <div className="space-y-1">
                <p className="h-10" />
                <p className="border-t border-slate-400 pt-1.5 w-44 text-center font-bold">Technician Signature</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="h-10" />
                <p className="border-t border-slate-400 pt-1.5 w-44 text-center font-bold">Authorized Sign / Seal</p>
              </div>
            </div>
          </div>

          {/* Footer block conditional on print mode */}
          {printMode === 'digital' ? (
            <div className="absolute bottom-6 left-0 right-0 border-t-2 border-[#A81F25] pt-3 text-center text-[9.5px] text-slate-600 font-sans leading-normal">
              <p className="font-bold">B.O.: H.No.3-1-679, Vavilalapally, Karimnagar, Telangana State - 505 001.</p>
              <p>Phone: +91 8499903275 &nbsp;|&nbsp; Email: apecprojects375@gmail.com</p>
            </div>
          ) : (
            // Blank space margin at the bottom for physical footer
            <div style={{ height: '1.2in' }} className="w-full" />
          )}

        </div>
      )}

      {/* ── STANDARD ERP VIEW (HIDDEN ON PRINT) ── */}
      <div className="print:hidden space-y-6">
        
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 lg:p-6 rounded-2xl glass-card border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyan-400" />
              Daily Progress Reports
            </h2>
            <p className="text-xs text-slate-400 mt-1">Submit activity logs, track task progressions, and export formatted letterheads</p>
          </div>

          <div className="flex items-center gap-2.5 z-10">
            {isFallbackMode && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Offline Local Save Active
              </span>
            )}
            
            <button
              onClick={() => setIsSubmitMode(!isSubmitMode)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.15)] hover:shadow-lg"
            >
              {isSubmitMode ? <ArrowLeft className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isSubmitMode ? 'View Report History' : 'Write Daily Report'}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isSubmitMode ? (
            /* ── REPORT SUBMISSION FORM ── */
            <motion.div
              key="report-form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl glass-card p-6 rounded-2xl border border-white/10 shadow-xl space-y-6"
            >
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Create Daily Progress Log
                </h3>
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  SECURE REPORT REGISTRY
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* 1. Date & Project Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Report Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        required
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Project Site / Hub</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-150 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-xs flex justify-between items-center text-left"
                      >
                        <span>{selectedProject ? selectedProject.name : 'Select Project Site...'}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isProjectDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsProjectDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1"
                            >
                              {projectsList.map(proj => (
                                <button
                                  key={proj.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProject(proj);
                                    setIsProjectDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                                    selectedProject?.id === proj.id 
                                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                      : 'text-slate-350 hover:bg-slate-800 border border-transparent'
                                  }`}
                                >
                                  {proj.name}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* 2. Employee Selector (Admin Only) & Hours Worked */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isAdmin ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Submit On Behalf Of</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTechDropdownOpen(!isTechDropdownOpen)}
                          className="w-full bg-slate-950/40 border border-slate-800 text-slate-150 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 text-xs flex justify-between items-center text-left"
                        >
                          <span>{selectedTechnician ? `${selectedTechnician.name} (${selectedTechnician.employeeId || 'Staff'})` : 'Select Team Member...'}</span>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isTechDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isTechDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsTechDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl p-1"
                              >
                                {teamList.map(member => (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTechnician(member);
                                      setIsTechDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                                      selectedTechnician?.id === member.id 
                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                                        : 'text-slate-350 hover:bg-slate-800 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex justify-between">
                                      <span>{member.name}</span>
                                      <span className="text-[10px] text-slate-500">{member.employeeId || ''}</span>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    // Read only card for standard employees
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Technician Submitting</label>
                      <div className="w-full bg-slate-950/20 border border-slate-900 text-slate-400 rounded-xl py-3 px-4 text-xs font-semibold">
                        {selectedTechnician ? `${selectedTechnician.name} (${selectedTechnician.employeeId || 'Staff'})` : activeName}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Hours Logged</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(e.target.value)}
                        required
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Text Areas */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tasks Completed Today</label>
                    <textarea
                      rows={3}
                      value={tasksCompleted}
                      onChange={(e) => setTasksCompleted(e.target.value)}
                      required
                      placeholder="- Wire installation of grid substation transformer A&#10;- Safety clearance and checklist completed&#10;- LOTO procedures executed"
                      className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl p-4 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed placeholder:text-slate-650"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Next Tasks / Future Plan</label>
                    <textarea
                      rows={2}
                      value={tasksInProgress}
                      onChange={(e) => setTasksInProgress(e.target.value)}
                      required
                      placeholder="- Commissioning transformer A and synchronization with power grids&#10;- Site cleanup"
                      className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl p-4 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed placeholder:text-slate-650"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Challenges Faced (Optional)</label>
                      <textarea
                        rows={2}
                        value={challenges}
                        onChange={(e) => setChallenges(e.target.value)}
                        placeholder="Material dispatch delayed by 2 hours due to rainfall..."
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl p-4 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed placeholder:text-slate-650"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Materials Used (Optional)</label>
                      <textarea
                        rows={2}
                        value={materialsUsed}
                        onChange={(e) => setMaterialsUsed(e.target.value)}
                        placeholder="100m copper cabling, 4 standard terminal connectors..."
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl p-4 focus:outline-none focus:border-cyan-500 text-xs leading-relaxed placeholder:text-slate-650"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Drag & Drop Attachment Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Attach Progress Photo or PDF Document</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  
                  {attachedFile ? (
                    <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-3 min-w-0">
                        {attachedFile.type.startsWith('image/') && filePreviewUrl ? (
                          <img src={filePreviewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-rose-955/20 border border-rose-800/40 flex items-center justify-center text-rose-500 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{attachedFile.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(attachedFile.size / 1024 / 1024).toFixed(2)} MB • {attachedFile.type || 'unknown'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-900 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 bg-slate-950/20 hover:bg-slate-950/30 border border-dashed border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                    >
                      <Paperclip className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      <p className="text-xs font-bold text-slate-400 group-hover:text-slate-200">Click to upload file</p>
                      <p className="text-[10px] text-slate-550">Supports JPEG, PNG photos or PDF documents up to 5MB</p>
                    </button>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isDbActionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-955 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDbActionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering Report...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4.5 h-4.5" />
                      Submit Daily Progress Report
                    </>
                  )}
                </button>

              </form>
            </motion.div>
          ) : (
            /* ── REPORT HISTORY & DIRECTORY ── */
            <motion.div
              key="report-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              
              {/* Filters Panel */}
              <div className="p-5 rounded-2xl glass-card border border-white/10 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    Search & Query Filters
                  </h3>
                  
                  {/* Date range inputs */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From:</span>
                      <input 
                        type="date"
                        value={startDateStr}
                        onChange={(e) => setStartDateStr(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To:</span>
                      <input 
                        type="date"
                        value={endDateStr}
                        onChange={(e) => setEndDateStr(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-900/60" />

                {/* Text search, project & employee dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search tasks, tools, names..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Site:</span>
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Active Sites</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Employee:</span>
                      <select
                        value={techFilter}
                        onChange={(e) => setTechFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Employees</option>
                        {teamList.map(t => (
                          <option key={t.id} value={t.employeeId || t.id}>{t.name} ({t.employeeId || 'Staff'})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={`flex items-center gap-2.5 ${isAdmin ? 'col-span-1' : 'col-span-2 justify-end'}`}>
                    <button
                      onClick={handleExportCSV}
                      disabled={filteredReports.length === 0}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV List
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Directory Table / Cards */}
              <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-white/10 p-5">
                <h4 className="text-xs font-bold text-slate-150 uppercase tracking-wider mb-4 border-b border-slate-900 pb-3 font-mono">
                  Registered Progress Logs ({filteredReports.length})
                </h4>

                {filteredReports.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 italic text-sm">
                    No matching daily progress logs recorded in the selected range.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReports.map((report) => {
                      const isExpanded = activeDetailReport?.id === report.id;
                      return (
                        <div 
                          key={report.id}
                          className="border border-slate-900/60 rounded-xl bg-slate-950/15 overflow-hidden transition-all duration-300 hover:border-slate-800"
                        >
                          {/* Header Summary Row */}
                          <div 
                            onClick={() => setActiveDetailReport(isExpanded ? null : report)}
                            className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer hover:bg-slate-950/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-cyan-955/20 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
                                <ClipboardList className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-200 block">{report.projectName}</span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block sm:inline">Date: {report.date}</span>
                                {isAdmin && (
                                  <span className="text-[10px] text-cyan-455 font-bold font-mono sm:ml-3 block sm:inline">
                                    Engineer: {report.technicianName} ({report.technicianId})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-850 text-[10.5px] text-slate-400 font-bold font-mono">
                                {report.hoursWorked} hours
                              </span>
                              
                              {report.attachmentUrl && (
                                <span className="w-5 h-5 rounded-full bg-cyan-955/25 border border-cyan-800/30 flex items-center justify-center text-cyan-400" title="Attachment attached">
                                  <Paperclip className="w-3 h-3" />
                                </span>
                              )}

                              <button
                                className="p-1 rounded text-slate-400 hover:text-slate-250 transition-colors"
                              >
                                <Eye className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Detail Panel */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-slate-900 bg-slate-950/5"
                              >
                                <div className="p-5 space-y-5 text-xs leading-relaxed text-slate-350">
                                  
                                  {/* Grid Tasks Layout */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/20 border border-slate-900 shadow-inner">
                                      <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[9.5px] border-b border-slate-900 pb-1.5">
                                        Tasks Completed Today
                                      </h5>
                                      <p className="whitespace-pre-wrap mt-2 font-medium font-mono text-[11px] text-slate-300">{report.tasksCompleted}</p>
                                    </div>

                                    <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/20 border border-slate-900 shadow-inner">
                                      <h5 className="font-bold text-slate-200 uppercase tracking-wider text-[9.5px] border-b border-slate-900 pb-1.5">
                                        Next Tasks / Future Plan
                                      </h5>
                                      <p className="whitespace-pre-wrap mt-2 font-medium font-mono text-[11px] text-slate-300">{report.tasksInProgress}</p>
                                    </div>
                                  </div>

                                  {/* Challenges & Materials */}
                                  {(report.challenges || report.materialsUsed) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                      {report.challenges ? (
                                        <div className="space-y-1.5 p-3.5 rounded-xl bg-rose-955/5 border border-rose-900/20 shadow-inner">
                                          <h5 className="font-bold text-rose-400 uppercase tracking-wider text-[9.5px] border-b border-rose-900/20 pb-1.5">
                                            Challenges faced
                                          </h5>
                                          <p className="whitespace-pre-wrap mt-2 font-medium font-mono text-[11px] text-rose-350">{report.challenges}</p>
                                        </div>
                                      ) : <div />}

                                      {report.materialsUsed ? (
                                        <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/20 border border-slate-900 shadow-inner">
                                          <h5 className="font-bold text-slate-205 uppercase tracking-wider text-[9.5px] border-b border-slate-900 pb-1.5">
                                            Materials & Tools Used
                                          </h5>
                                          <p className="whitespace-pre-wrap mt-2 font-medium font-mono text-[11px] text-slate-300">{report.materialsUsed}</p>
                                        </div>
                                      ) : <div />}
                                    </div>
                                  )}

                                  {/* Submitter telemetry info */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-900/60">
                                    <div>
                                      <span>Log Entry Submitter: </span>
                                      <span className="font-bold text-slate-400">{report.submitterEmail}</span>
                                      {report.submittedByAdmin && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-red-955/20 border border-red-900/30 text-red-400 font-bold uppercase text-[8px] tracking-wide">
                                          Admin Filed
                                        </span>
                                      )}
                                    </div>
                                    <span>Sync Timestamp: {new Date(report.timestamp).toLocaleString()}</span>
                                  </div>

                                  {/* Action Buttons Row & Attachment Preview Link */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/60 pt-3">
                                    <div>
                                      {report.attachmentUrl && (
                                        <button
                                          onClick={() => {
                                            const isPdf = report.attachmentName?.toLowerCase().endsWith('.pdf') || report.attachmentType === 'application/pdf';
                                            if (isPdf) {
                                              setViewingPdf({ url: report.attachmentUrl!, name: report.attachmentName || 'Document.pdf' });
                                            } else {
                                              setViewingImage({ url: report.attachmentUrl!, name: report.attachmentName || 'Photo.jpg' });
                                            }
                                          }}
                                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                          <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                                          View Attachment: {report.attachmentName || 'Document'}
                                        </button>
                                      )}
                                    </div>

                                    {/* Prints & Word downloads */}
                                    <div className="flex items-center gap-2">
                                      {/* Word Export Dropdown or separate buttons */}
                                      <button
                                        onClick={() => triggerDownloadDoc('digital', report)}
                                        className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Download formatted MS Word document"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                        Download Word (Digital)
                                      </button>
                                      
                                      <button
                                        onClick={() => triggerDownloadDoc('stationery', report)}
                                        className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Download Word doc without logo for physical paper"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                                        Download Word (Stationery)
                                      </button>

                                      <span className="h-6 w-px bg-slate-850" />

                                      <button
                                        onClick={() => triggerPrint('digital', report)}
                                        className="px-3.5 py-2 rounded-xl bg-cyan-955/20 border border-cyan-800/30 text-cyan-400 hover:bg-cyan-955/40 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Print digital copy with header logo & branch footer"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        Print (Digital Letterhead)
                                      </button>

                                      <button
                                        onClick={() => triggerPrint('stationery', report)}
                                        className="px-3.5 py-2 rounded-xl bg-[#A81F25]/10 border border-[#A81F25]/20 text-[#DC2626] hover:bg-[#A81F25]/20 text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Print clean text aligned to physical letterhead paper"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        Print on Letterhead Paper
                                      </button>
                                    </div>

                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── MODALS FOR ATTACHMENT VIEWING ── */}
      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url || ''}
        imageName={viewingImage?.name || ''}
      />

      <PDFViewerModal
        isOpen={!!viewingPdf}
        onClose={() => setViewingPdf(null)}
        fileUrl={viewingPdf?.url || ''}
        fileName={viewingPdf?.name || ''}
      />

    </div>
  );
}
