import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Trash2, 
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';

export default function Inventory() {
  const { setFirestoreError, isDbActionLoading, setIsDbActionLoading } = useOutletContext<any>();

  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  // Asset Custody States
  const [teamList, setTeamList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [custodyList, setCustodyList] = useState<any[]>([]);

  const [checkoutTechnician, setCheckoutTechnician] = useState('');
  const [checkoutProject, setCheckoutProject] = useState('');
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Fetch Team, Projects and Custody logs
  useEffect(() => {
    if (!db) {
      setTeamList([
        { id: '1', name: 'Rahul Sharma', email: 'rahul@apecpowersolutions.com' },
        { id: '2', name: 'Sanjay Kumar', email: 'sanjay@apecpowersolutions.com' }
      ]);
      setProjectsList([
        { id: '1', name: 'Grid Substation Hubli', site: 'Site Alpha' },
        { id: '2', name: 'Koppal Wind Farm', site: 'Site Beta' }
      ]);
      setCustodyList([]);
      return;
    }
    
    const unsubTeam = onSnapshot(collection(db, 'team'), (snap) => {
      setTeamList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjectsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCustody = onSnapshot(collection(db, 'asset_custody'), (snap) => {
      setCustodyList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTeam();
      unsubProjects();
      unsubCustody();
    };
  }, []);

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

  const handleCheckout = async (item: any) => {
    if (checkoutQuantity <= 0 || checkoutQuantity > item.quantity) {
      alert("Invalid checkout quantity");
      return;
    }
    if (!checkoutTechnician || !checkoutProject) {
      alert("Please select technician and project site");
      return;
    }

    const techObj = teamList.find(t => t.id === checkoutTechnician);
    const projObj = projectsList.find(p => p.id === checkoutProject);

    const checkoutObj = {
      itemId: item.id,
      itemName: item.name,
      technicianId: checkoutTechnician,
      technicianName: techObj?.name || 'Unknown Custodian',
      projectId: checkoutProject,
      projectName: projObj?.name || 'Unknown Site',
      quantity: checkoutQuantity,
      timestamp: Timestamp.now()
    };

    setIsDbActionLoading(true);
    try {
      if (db) {
        await addDoc(collection(db, 'asset_custody'), checkoutObj);
        
        const nextQty = item.quantity - checkoutQuantity;
        const nextStatus = nextQty === 0 ? 'Out of Stock' : nextQty < 5 ? 'Low Stock' : 'In Stock';
        await updateDoc(doc(db, 'inventory', item.id), {
          quantity: nextQty,
          status: nextStatus
        });

        await addDoc(collection(db, 'activities'), {
          title: 'Asset Checked Out',
          desc: `${checkoutQuantity}x ${item.name} checked out to ${techObj?.name || 'Custodian'} for ${projObj?.name || 'Site'}`,
          type: 'package',
          timestamp: Timestamp.now()
        });
      } else {
        const nextQty = item.quantity - checkoutQuantity;
        const nextStatus = nextQty === 0 ? 'Out of Stock' : nextQty < 5 ? 'Low Stock' : 'In Stock';
        setInventoryList(prev => prev.map(i => i.id === item.id ? { ...i, quantity: nextQty, status: nextStatus } : i));
        setCustodyList(prev => [...prev, { id: Math.random().toString(), ...checkoutObj }]);
      }
      setCheckoutQuantity(1);
      setCheckoutTechnician('');
      setCheckoutProject('');
    } catch (err) {
      console.error('Error during asset checkout:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  const handleReturn = async (custodyRecord: any) => {
    const item = inventoryList.find(i => i.id === custodyRecord.itemId);
    if (!item) return;

    setIsDbActionLoading(true);
    try {
      if (db) {
        await deleteDoc(doc(db, 'asset_custody', custodyRecord.id));

        const nextQty = item.quantity + custodyRecord.quantity;
        const nextStatus = nextQty > 5 ? 'In Stock' : 'Low Stock';
        await updateDoc(doc(db, 'inventory', item.id), {
          quantity: nextQty,
          status: nextStatus
        });

        await addDoc(collection(db, 'activities'), {
          title: 'Asset Returned',
          desc: `${custodyRecord.quantity}x ${custodyRecord.itemName} returned by ${custodyRecord.technicianName}`,
          type: 'package',
          timestamp: Timestamp.now()
        });
      } else {
        const nextQty = item.quantity + custodyRecord.quantity;
        const nextStatus = nextQty > 5 ? 'In Stock' : 'Low Stock';
        setInventoryList(prev => prev.map(i => i.id === item.id ? { ...i, quantity: nextQty, status: nextStatus } : i));
        setCustodyList(prev => prev.filter(c => c.id !== custodyRecord.id));
      }
    } catch (err) {
      console.error('Error during asset return:', err);
    } finally {
      setIsDbActionLoading(false);
    }
  };

  if (isInventoryLoading) {
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
      <div>
        <h3 className="text-xl font-bold text-slate-100">APEC Inventory & Asset Custody</h3>
        <p className="text-xs text-slate-400 mt-1">Track power solutions assets, cables, and engineer custody allocations</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        {inventoryList.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Package className="w-14 h-14 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-400">Inventory is empty</p>
            <p className="text-xs text-slate-505 mt-1">Populate items using the Seeding controls in Settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/45 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="p-4">Item Description</th>
                  <th className="p-4">Available Quantity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                {inventoryList.map((item) => {
                  const activeCustodies = custodyList.filter(c => c.itemId === item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-900/30 transition-colors">
                        <td 
                          onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                          className="p-4 font-bold text-slate-100 cursor-pointer hover:text-cyan-400 transition-colors"
                        >
                          {item.name}
                        </td>
                        <td 
                          onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                          className="p-4 font-medium cursor-pointer"
                        >
                          {item.quantity} {item.unit}
                          {activeCustodies.length > 0 && (
                            <span className="ml-2 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                              {activeCustodies.reduce((sum, c) => sum + c.quantity, 0)} Out
                            </span>
                          )}
                        </td>
                        <td 
                          onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                          className="p-4 cursor-pointer"
                        >
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'In Stock' ? 'bg-green-950/40 text-green-400 border border-green-500/25' :
                            item.status === 'Low Stock' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/25' :
                            'bg-rose-955/40 text-rose-400 border border-rose-500/25'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDeleteDocument('inventory', item.id, item.name)}
                            disabled={isDbActionLoading}
                            className="p-1.5 text-slate-550 hover:text-rose-500 transition-colors rounded hover:bg-rose-950/20 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Asset Custody / Checkout Panel */}
                      {expandedItemId === item.id && (
                        <tr className="bg-slate-955/20">
                          <td colSpan={4} className="p-4 border-t border-slate-800/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                              {/* Checkout Form */}
                              <div className="space-y-3">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Checkout Terminal</h5>
                                {item.quantity <= 0 ? (
                                  <p className="text-xs text-rose-400 bg-rose-955/10 border border-rose-500/10 p-3 rounded-xl">
                                    This asset is currently Out of Stock. Cannot perform custody allocations.
                                  </p>
                                ) : (
                                  <div className="space-y-3.5 max-w-sm">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Assign Custodian</label>
                                      <select
                                        value={checkoutTechnician}
                                        onChange={(e) => setCheckoutTechnician(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
                                      >
                                        <option value="">Select Technician...</option>
                                        {teamList.map(t => (
                                          <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Destination Project / Site</label>
                                      <select
                                        value={checkoutProject}
                                        onChange={(e) => setCheckoutProject(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500 text-xs cursor-pointer"
                                      >
                                        <option value="">Select Target Site...</option>
                                        {projectsList.map(p => (
                                          <option key={p.id} value={p.id}>{p.name} ({p.site})</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">Quantity to Alloc (Max: {item.quantity})</label>
                                      <input 
                                        type="number"
                                        min="1"
                                        max={item.quantity}
                                        value={checkoutQuantity}
                                        onChange={(e) => setCheckoutQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 focus:outline-none focus:border-cyan-500 text-xs"
                                      />
                                    </div>
                                    <button 
                                      onClick={() => handleCheckout(item)}
                                      disabled={isDbActionLoading}
                                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-955 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                      Assign Asset
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Active Custody List */}
                              <div>
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Current Custody Logs</h5>
                                {activeCustodies.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-4">No active custody allocations. All items are in local stock.</p>
                                ) : (
                                  <div className="space-y-2.5">
                                    {activeCustodies.map((c) => (
                                      <div key={c.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between text-xs hover:border-slate-800 transition-colors">
                                        <div>
                                          <span className="font-bold text-slate-200 block">{c.technicianName}</span>
                                          <span className="text-slate-400 text-[10px] block mt-0.5">Allocated: {c.quantity} unit(s) ➜ {c.projectName}</span>
                                        </div>
                                        <button 
                                          onClick={() => handleReturn(c)}
                                          disabled={isDbActionLoading}
                                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-[10px] transition-colors"
                                        >
                                          Return Item
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
