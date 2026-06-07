import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Trash2, 
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Inventory() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  // Safety fallback timeout to prevent infinite loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInventoryLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!db) {
      setIsInventoryLoading(false);
      return;
    }

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventoryList(items);
      setIsInventoryLoading(false);
    }, (err) => {
      console.error('Inventory listener error:', err);
      setFirestoreError(err.code);
      setIsInventoryLoading(false);
    });

    return () => unsubInventory();
  }, [setFirestoreError]);

  const handleDeleteDocument = async (colName: string, id: string, docNameForLog?: string) => {
    if (!db) return;
    setIsDbActionLoading(true);
    try {
      await deleteDoc(doc(db, colName, id));
      // Log activity
      if (docNameForLog) {
        await addDoc(collection(db, 'activities'), {
          title: `${colName.slice(0, -1)} removed`,
          desc: `"${docNameForLog}" was deleted from the ERP database`,
          type: 'settings',
          timestamp: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  if (isInventoryLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-30">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-white">APEC Inventory</h3>
        <p className="text-xs text-slate-400 mt-1">Track power solutions assets, cables, and equipment</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md">
        {inventoryList.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Package className="w-14 h-14 text-slate-800 mb-3" />
            <p className="text-sm font-medium text-slate-400">Inventory is empty</p>
            <p className="text-xs text-slate-600 mt-1">Populate items using the Seeding controls in Settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="p-4">Item Description</th>
                  <th className="p-4">Available Quantity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {inventoryList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-medium text-white">{item.name}</td>
                    <td className="p-4">{item.quantity} {item.unit}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'In Stock' ? 'bg-green-500/10 text-green-400' :
                        item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteDocument('inventory', item.id, item.name)}
                        disabled={isDbActionLoading}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
