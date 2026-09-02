import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { ChallengesApp } from './challenges/ChallengesApp';
import { EventsApp } from './events/EventsApp';
import { HomeApp } from './home/HomeApp';
import { MinigamesApp } from './minigames/MinigamesApp';
import { ProjectionApp } from './projection/ProjectionApp';
import { WorkspaceApp } from './workspace/WorkspaceApp';
import { RuntimePresentationHarness } from './workspace/RuntimePresentationHarness';

const runtimeHarnessEnabled = window.location.hostname === '127.0.0.1' || import.meta.env.VITE_WORKSPACE_RUNTIME_TEST === 'true';

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><Routes>
  <Route path="/" element={<HomeApp />} />
  <Route path="/workspace" element={<WorkspaceApp />} />
  <Route path="/events" element={<EventsApp />} />
  <Route path="/challenges" element={<ChallengesApp />} />
  <Route path="/minigames" element={<MinigamesApp />} />
  <Route path="/projection" element={<ProjectionApp />} />
  <Route path="/workspace-runtime-test" element={runtimeHarnessEnabled ? <RuntimePresentationHarness /> : <HomeApp />} />
</Routes></HashRouter></StrictMode>);
