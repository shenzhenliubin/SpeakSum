import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Direct imports
import Home from '@/pages/Home';
import Timeline from '@/pages/Timeline';
import MeetingDetail from '@/pages/MeetingDetail';
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import Upload from '@/pages/Upload';
import ProcessingProgress from '@/pages/ProcessingProgress';
import Settings from '@/pages/Settings';
import ModelSettings from '@/pages/settings/ModelSettings';
import GeneralSettings from '@/pages/settings/GeneralSettings';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public routes
      {
        path: 'login',
        element: <Login />,
      },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: 'timeline',
            children: [
              {
                index: true,
                element: <Timeline />,
              },
              {
                path: ':contentId',
                element: <MeetingDetail />,
              },
            ],
          },
          {
            path: 'graph',
            element: <KnowledgeGraph />,
          },
          {
            path: 'upload',
            children: [
              {
                index: true,
                element: <Upload />,
              },
              {
                path: 'progress/:taskId',
                element: <ProcessingProgress />,
              },
            ],
          },
          {
            path: 'settings',
            element: <Settings />,
            children: [
              {
                index: true,
                element: <Navigate to="models" replace />,
              },
              {
                path: 'models',
                element: <ModelSettings />,
              },
              {
                path: 'general',
                element: <GeneralSettings />,
              },
              {
                path: 'identities',
                element: <Navigate to="/settings/models" replace />,
              },
            ],
          },
        ],
      },

      // 404
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

// Re-export route metadata from separate file to avoid fast-refresh warning
export { routeMeta } from './meta';
