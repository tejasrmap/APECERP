import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // If Firebase Auth is not configured, fall back to localStorage check for development purposes
    if (!auth) {
      const isLocalAuth = localStorage.getItem('isAuthenticated') === 'true';
      setAuthenticated(isLocalAuth);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (db && user.email) {
          const emailLower = user.email.toLowerCase();
          const isVirtual = emailLower.endsWith('@apec-erp.local');
          const isAdminEmail = 
            emailLower === 'admin@apecpowersolutions.com' ||
            emailLower === 'managingdirector@apecpowersolutions.com';

          if (isAdminEmail) {
            setAuthenticated(true);
          } else {
            try {
              let matched = false;

              if (isVirtual) {
                const cleanUserPhone = emailLower.split('@')[0];
                const phoneCandidates = [
                  '+' + cleanUserPhone,
                  cleanUserPhone,
                  cleanUserPhone.slice(-10),
                ].filter(Boolean);

                let matchedDoc = null;
                for (const candidate of phoneCandidates) {
                  const q = query(collection(db, 'team'), where('phone', '==', candidate));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    matchedDoc = snap.docs[0];
                    break;
                  }
                }

                if (!matchedDoc && cleanUserPhone.length >= 10) {
                  const allSnap = await getDocs(collection(db, 'team'));
                  const loginLast10 = cleanUserPhone.slice(-10);
                  for (const docSnap of allSnap.docs) {
                    const phoneVal = docSnap.data().phone;
                    const storedClean = (phoneVal !== undefined && phoneVal !== null ? String(phoneVal) : '').replace(/[\s+-]/g, '');
                    if (storedClean.length >= 10 && storedClean.slice(-10) === loginLast10) {
                      matchedDoc = docSnap;
                      break;
                    }
                  }
                }

                if (matchedDoc) {
                  const docData = matchedDoc.data();
                  if (docData.status !== 'Inactive') {
                    matched = true;
                    // Asynchronously update lastActive timestamp
                    updateDoc(doc(db, 'team', matchedDoc.id), {
                      lastActive: Timestamp.now()
                    }).catch(e => console.error("Error updating lastActive:", e));
                  }
                }
              } else {
                const q = query(collection(db, 'team'), where('email', '==', emailLower));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const docData = snap.docs[0].data();
                  if (docData.status !== 'Inactive') {
                    matched = true;
                    // Asynchronously update lastActive timestamp
                    updateDoc(doc(db, 'team', snap.docs[0].id), {
                      lastActive: Timestamp.now()
                    }).catch(e => console.error("Error updating lastActive:", e));
                  }
                }
              }

              if (matched) {
                setAuthenticated(true);
              } else {
                // Sign out if not in the team database
                await auth.signOut();
                localStorage.removeItem('isAuthenticated');
                setAuthenticated(false);
              }
            } catch (err) {
              console.error('Error checking team authorization:', err);
              try {
                await auth.signOut();
              } catch (_) {}
              localStorage.removeItem('isAuthenticated');
              setAuthenticated(false);
            }
          }
        } else {
          // If Firestore is not configured/available, fall back to standard auth check
          setAuthenticated(true);
        }
      } else {
        // Double check localStorage in case they are logged in via local auth state
        const isLocalAuth = localStorage.getItem('isAuthenticated') === 'true';
        setAuthenticated(isLocalAuth);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return authenticated ? <Outlet /> : <Navigate to="/" replace />;
}
