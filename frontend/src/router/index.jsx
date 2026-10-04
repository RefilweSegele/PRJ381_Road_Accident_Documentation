import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProcessingStatus from '../features/investigator/ProcessingStatus';

export const router = createBrowserRouter([
  // Redirect root URL directly to Member 6's page for Case #101
  {
    path: '/',
    element: <Navigate to="/investigator/cases/101/status" replace />,
  },

  // Member 6 Route: Processing Status Monitor
  {
    path: '/investigator/cases/:id/status',
    element: <ProcessingStatus />,
  },

  // Simple placeholder for when "View 3D Model" button is clicked
  {
    path: '/review/cases/:id',
    element: (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>3D Viewer Placeholder (Member 8)</h2>
        <p>This is where the React Three Fiber viewer will display once integrated.</p>
        <a href="/investigator/cases/101/status">← Back to Status Monitor</a>
      </div>
    ),
  },

  // Catch-all route to prevent blank screens on invalid URLs
  {
    path: '*',
    element: <Navigate to="/investigator/cases/101/status" replace />,
  },
]);

export default router;