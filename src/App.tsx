import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Eagerly loaded (always needed)
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';

// Lazy loaded (only parsed when the route is visited)
const Overview     = lazy(() => import('./components/Overview'));
const Projects     = lazy(() => import('./components/Projects'));
const Team         = lazy(() => import('./components/Team'));
const Chat         = lazy(() => import('./components/Chat'));
const Settings     = lazy(() => import('./components/Settings'));
const TeamControl  = lazy(() => import('./components/TeamControl'));
const Scheduling   = lazy(() => import('./components/Scheduling'));
const ProfileView  = lazy(() => import('./components/ProfileView'));
const Attendance   = lazy(() => import('./components/Attendance'));
const Reports      = lazy(() => import('./components/Reports'));
const Leaves       = lazy(() => import('./components/Leaves'));
const LiveTracking = lazy(() => import('./components/LiveTracking'));
const MyProfile    = lazy(() => import('./components/MyProfile'));

const PageLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-[#070a13]/50 z-30">
    <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/profile/:id" element={
        <Suspense fallback={<PageLoader />}><ProfileView /></Suspense>
      } />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}><Overview /></Suspense>
          } />
          <Route path="projects" element={
            <Suspense fallback={<PageLoader />}><Projects /></Suspense>
          } />
          <Route path="team" element={
            <Suspense fallback={<PageLoader />}><Team /></Suspense>
          } />
          <Route path="workforce" element={
            <Suspense fallback={<PageLoader />}><Chat /></Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}><Settings /></Suspense>
          } />
          <Route path="my-profile" element={
            <Suspense fallback={<PageLoader />}><MyProfile /></Suspense>
          } />
          <Route path="team-control" element={
            <Suspense fallback={<PageLoader />}><TeamControl /></Suspense>
          } />
          <Route path="scheduling" element={
            <Suspense fallback={<PageLoader />}><Scheduling /></Suspense>
          } />
          <Route path="attendance" element={
            <Suspense fallback={<PageLoader />}><Attendance /></Suspense>
          } />
          <Route path="reports" element={
            <Suspense fallback={<PageLoader />}><Reports /></Suspense>
          } />
          <Route path="leaves" element={
            <Suspense fallback={<PageLoader />}><Leaves /></Suspense>
          } />
          <Route path="live-tracking" element={
            <Suspense fallback={<PageLoader />}><LiveTracking /></Suspense>
          } />

        </Route>
      </Route>
    </Routes>
  );
}
