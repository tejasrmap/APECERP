import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Overview from './components/Overview';
import Projects from './components/Projects';
import Inventory from './components/Inventory';
import Team from './components/Team';
import Chat from './components/Chat';
import Settings from './components/Settings';
import TeamControl from './components/TeamControl';
import ProtectedRoute from './components/ProtectedRoute';
import Scheduling from './components/Scheduling';
import Safety from './components/Safety';
import VerifyTag from './components/VerifyTag';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/verify-tag/:tagUid" element={<VerifyTag />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Overview />} />
          <Route path="projects" element={<Projects />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="team" element={<Team />} />
          <Route path="workforce" element={<Chat />} />
          <Route path="settings" element={<Settings />} />
          <Route path="team-control" element={<TeamControl />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="safety" element={<Safety />} />
        </Route>
      </Route>
    </Routes>
  );
}
