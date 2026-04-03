import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Home,
  Timeline,
  MeetingDetail,
  KnowledgeGraph,
  Upload,
  ProcessingProgress,
  Settings,
  ModelSettings,
  IdentitySettings,
  GeneralSettings,
  Login,
  NotFound,
} from './lazyComponents';

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
                path: ':meetingId',
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
                path: 'identities',
                element: <IdentitySettings />,
              },
              {
                path: 'general',
                element: <GeneralSettings />,
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
