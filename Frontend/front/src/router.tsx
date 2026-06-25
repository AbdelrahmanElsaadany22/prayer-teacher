import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './app/layouts/Mainlayout';
import AuthLayout from './app/layouts/AuthLayout';
import Home from './app/pages/Home';
import NotFound from './app/pages/NotFound';
import GuestRoute from './features/auth/components/GuestRoute';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import Dashboard from './features/auth/pages/Dashboard';
import Login from './features/auth/pages/Login';
import Signup from './features/auth/pages/Signup';
import { PrayerSession } from './features/prayer';
import FriendsPage from './features/friends/pages/FriendsPage';
import ChatPage from './features/chat/pages/ChatPage';
import UserProfilePage from './features/users/pages/UserProfilePage';
import MyProfilePage from './features/users/pages/MyProfilePage';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/prayer', element: <PrayerSession /> },
          { path: '/friends', element: <FriendsPage /> },
          { path: '/profile', element: <MyProfilePage /> },
          { path: '/users/:userId', element: <UserProfilePage /> },
          { path: '/chat/:friendId', element: <ChatPage /> },
        ],
      },
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
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
