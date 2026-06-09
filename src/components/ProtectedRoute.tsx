import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
          const isAdminEmail = 
            emailLower === 'admin@apecpowersolutions.com' ||
            emailLower === 'managingdirector@apecpowersolutions.com';

          if (isAdminEmail) {
            setAuthenticated(true);
          } else {
            try {
              const q = query(collection(db, 'team'), where('email', '==', user.email));
              const snap = await getDocs(q);
              if (!snap.empty) {
                setAuthenticated(true);
              } else {
                // Sign out if not in the team database
                await auth.signOut();
                localStorage.removeItem('isAuthenticated');
                setAuthenticated(false);
              }
            } catch (err) {
              console.error('Error checking team authorization:', err);
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
