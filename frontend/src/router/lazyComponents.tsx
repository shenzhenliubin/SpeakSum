// Lazy load pages for better performance
import { lazy } from 'react';

export const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
export const Timeline = lazy(() => import('@/pages/Timeline').then((m) => ({ default: m.Timeline })));
export const MeetingDetail = lazy(() => import('@/pages/MeetingDetail').then((m) => ({ default: m.MeetingDetail })));
export const KnowledgeGraph = lazy(() => import('@/pages/KnowledgeGraph').then((m) => ({ default: m.KnowledgeGraph })));
export const Upload = lazy(() => import('@/pages/Upload').then((m) => ({ default: m.Upload })));
export const ProcessingProgress = lazy(() => import('@/pages/ProcessingProgress').then((m) => ({ default: m.ProcessingProgress })));
export const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
export const ModelSettings = lazy(() => import('@/pages/settings/ModelSettings').then((m) => ({ default: m.ModelSettings })));
export const IdentitySettings = lazy(() => import('@/pages/settings/IdentitySettings').then((m) => ({ default: m.IdentitySettings })));
export const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings').then((m) => ({ default: m.GeneralSettings })));
export const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
export const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));
