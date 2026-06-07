import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Settings() {
  const { isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

  const clearDatabaseHelper = async () => {
    if (!db) return;
    const collections = ['projects', 'alerts', 'tasks', 'activities', 'inventory', 'team', 'messages'];
    for (const colName of collections) {
      const snapshot = await getDocs(collection(db, colName));
      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, colName, docSnapshot.id));
      }
    }
  };

  const seedDemoData = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await clearDatabaseHelper();

      // Seed projects
      const projects = [
        { name: 'Project Alpha (Grid Substation)', status: 'Active', site: 'Site A - Hubli', manager: 'John Doe' },
        { name: 'Project Beta (Solar Farm)', status: 'Active', site: 'Site B - Belgaum', manager: 'Jane Smith' },
        { name: 'Project Gamma (Transmission Lines)', status: 'Pending', site: 'Site C - Dharwad', manager: 'Mike Johnson' },
      ];
      for (const p of projects) {
        await addDoc(collection(db, 'projects'), p);
      }

      // Seed alerts
      const alerts = [
        { title: 'Copper wiring running low', severity: 'high', status: 'pending' },
        { title: 'Safety inspection pending', severity: 'medium', status: 'pending' },
        { title: 'Delayed shipment - Concrete', severity: 'low', status: 'pending' },
      ];
      for (const a of alerts) {
        await addDoc(collection(db, 'alerts'), a);
      }

      // Seed tasks
      for (let i = 0; i < 5; i++) {
        await addDoc(collection(db, 'tasks'), { title: `Completed Safety Task ${i + 1}`, status: 'completed' });
      }

      // Seed activities
      const activities = [
        { title: 'New equipment logged', desc: 'Added 4 generators to Site A', type: 'package', timestamp: Timestamp.now() },
        { title: 'Phase 2 Approved', desc: 'Project Alpha cleared for next stage', type: 'task', timestamp: new Timestamp(Timestamp.now().seconds - 3600, 0) },
        { title: 'Low Inventory Alert', desc: 'Copper wiring running low', type: 'alert', timestamp: new Timestamp(Timestamp.now().seconds - 10800, 0) },
      ];
      for (const act of activities) {
        await addDoc(collection(db, 'activities'), act);
      }

      // Seed inventory
      const inventory = [
        { name: 'Copper Wiring 10mm', quantity: 120, unit: 'meters', status: 'Low Stock' },
        { name: 'Steel Reinforcement Rods', quantity: 15, unit: 'tons', status: 'In Stock' },
        { name: 'Portable Generators 5kW', quantity: 4, unit: 'units', status: 'In Stock' },
        { name: 'Electrical PVC Conduits', quantity: 0, unit: 'meters', status: 'Out of Stock' },
      ];
      for (const inv of inventory) {
        await addDoc(collection(db, 'inventory'), inv);
      }

      // Seed team
      const team = [
        { name: 'John Doe', role: 'Project Manager', email: 'john.doe@apec.com', status: 'Active' },
        { name: 'Jane Smith', role: 'Electrical Engineer', email: 'jane.smith@apec.com', status: 'Site Visit' },
        { name: 'Mike Johnson', role: 'Safety Inspector', email: 'mike.j@apec.com', status: 'Active' },
        { name: 'Sarah Connor', role: 'Operations Lead', email: 's.connor@apec.com', status: 'On Leave' },
      ];
      for (const t of team) {
        await addDoc(collection(db, 'team'), t);
      }

      // Seed greeting message
      await addDoc(collection(db, 'messages'), {
        roomId: 'group',
        text: 'Welcome to the APEC ERP Chat Room! Real-time database synchronizations are now fully configured.',
        senderEmail: 'system@apec.com',
        senderName: 'System',
        timestamp: Timestamp.now()
      });

    } catch (err) {
      console.error('Error seeding data:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const clearDatabase = async () => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await clearDatabaseHelper();
    } catch (err) {
      console.error('Error clearing database:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white">ERP System Settings</h3>
        <p className="text-xs text-slate-400 mt-1">Configure development utilities and database controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Seeder */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Firestore Database Management</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Insert or clean mock documents to quickly evaluate how other views (Projects, Inventory, Team) handle live datasets and empty screens.
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={seedDemoData}
              disabled={isDbActionLoading}
              className="flex-1 py-3 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Seed Demo Data'}
            </button>
            <button 
              onClick={clearDatabase}
              disabled={isDbActionLoading}
              className="flex-1 py-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDbActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Clear Database'}
            </button>
          </div>
        </div>

        {/* Environment Config Info */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-lg backdrop-blur-md">
          <h4 className="text-sm font-semibold text-white">Active System Environment</h4>
          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Firebase Project:</span>
              <span className="text-slate-300">apec-erp</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Sender ID (No.):</span>
              <span className="text-slate-300">477001925382</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Database Engine:</span>
              <span className="text-slate-300">Cloud Firestore</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500">ERP State:</span>
              <span className="text-green-400 font-bold">CONNECTED</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
