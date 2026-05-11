import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import SplashScreen from './components/ui/SplashScreen';

import MarketingShell from './routes/shells/MarketingShell';
import AuthShell from './routes/shells/AuthShell';
import AppShell from './routes/shells/AppShell';

import LandingPage from './pages/marketing/LandingPage';
import TermsPage from './pages/marketing/TermsPage';
import PrivacyPage from './pages/marketing/PrivacyPage';
import CookiesPage from './pages/marketing/CookiesPage';

import Signup from './pages/auth/Signup';
import SignupDetails from './pages/auth/SignupDetails';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import AuthCallback from './pages/auth/AuthCallback';

import Home from './pages/app/Home';
import Channels from './pages/app/Channels';
import ChannelDetail from './pages/app/ChannelDetail';
import Library from './pages/app/Library';
import Profile from './pages/app/Profile';
import StoryDetail from './pages/app/StoryDetail';
import Reader from './pages/app/Reader';
import AudioPlayer from './pages/app/AudioPlayer';
import Vote from './pages/app/Vote';
import VoteSuccess from './pages/app/VoteSuccess';
import Subscribe from './pages/app/Subscribe';
import Notifications from './pages/app/Notifications';
import NotifyMe from './pages/app/NotifyMe';

import AdminShell from './routes/shells/AdminShell';
import AdminDashboard from './pages/admin/Dashboard';
import AdminChannels from './pages/admin/Channels';
import AdminStories from './pages/admin/Stories';
import AdminStoryDetail from './pages/admin/StoryDetail';
import AdminSeasonEpisodes from './pages/admin/SeasonEpisodes';
import AdminUsers from './pages/admin/Users';
import AdminUserDetail from './pages/admin/UserDetail';
import AdminRevenue from './pages/admin/Revenue';
import AdminSettings from './pages/admin/Settings';

import NotFound from './pages/system/NotFound';
import ServerError from './pages/system/ServerError';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Routes>
      {/* §3.2 Marketing shell (public, indexable) */}
      <Route element={<MarketingShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/legal/terms" element={<TermsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route path="/legal/cookies" element={<CookiesPage />} />
      </Route>

      {/* §3.3 Auth shell (public, no chrome other than logo footer) */}
      <Route element={<AuthShell />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/details" element={<SignupDetails />} />
        <Route path="/signup/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      {/* §3.4 App shell (auth-gated; gating wires up in Phase 1) */}
      <Route element={<AppShell />}>
        <Route path="/home" element={<Home />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/channels/:slug" element={<ChannelDetail />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stories/:storyId" element={<StoryDetail />} />
        <Route path="/episodes/:id/read" element={<Reader />} />
        <Route path="/episodes/:id/listen" element={<AudioPlayer />} />
        <Route path="/episodes/:id/vote" element={<Vote />} />
        <Route path="/episodes/:id/vote-success" element={<VoteSuccess />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/notify-me/:episodeId" element={<NotifyMe />} />
      </Route>

      {/* §3.6 Admin shell (role-gated: admin + superadmin) */}
      <Route element={<AdminShell />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/channels" element={<AdminChannels />} />
        <Route path="/admin/stories" element={<AdminStories />} />
        <Route path="/admin/stories/:id" element={<AdminStoryDetail />} />
        <Route path="/admin/stories/:id/seasons/:seasonId/episodes" element={<AdminSeasonEpisodes />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        <Route path="/admin/revenue" element={<AdminRevenue />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>

      {/* §3.7 System routes */}
      <Route path="/500" element={<ServerError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
