import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './app/layouts/Mainlayout';
import AuthLayout from './app/layouts/AuthLayout';
import Home from './app/pages/Home';
import NotFound from './app/pages/NotFound';
import GuestRoute from './features/auth/components/GuestRoute';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import NonAdminRoute from './features/auth/components/NonAdminRoute';
import Dashboard from './features/auth/pages/Dashboard';
import Login from './features/auth/pages/Login';
import Signup from './features/auth/pages/Signup';
import Verify from './features/auth/pages/Verify';
import { PrayerSession } from './features/prayer';
import FriendsPage from './features/friends/pages/FriendsPage';
import ChatPage from './features/chat/pages/ChatPage';
import UserProfilePage from './features/users/pages/UserProfilePage';
import MyProfilePage from './features/users/pages/MyProfilePage';
import AdminRoute from './features/admin/components/AdminRoute';
import AdminUsersPage from './features/admin/pages/AdminUsersPage';
import AdminUserDetailPage from './features/admin/pages/AdminUserDetailPage';
import AdminInboxPage from './features/admin/pages/AdminInboxPage';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      { path: '/prayer-test', element: <PrayerSession /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/profile', element: <MyProfilePage /> },
          { path: '/users/:userId', element: <UserProfilePage /> },
        ],
      },
      {
        element: <NonAdminRoute />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/friends', element: <FriendsPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/users/:userId', element: <AdminUserDetailPage /> },
          { path: '/admin/messages', element: <AdminInboxPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/prayer', element: <PrayerSession /> },
      { path: '/chat/:friendId', element: <ChatPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/signup', element: <Signup /> },
          { path: '/verify', element: <Verify /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
