import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';
import Navbar from './components/layout/Navbar';

// Auth
import Login from './pages/auth/Login';
import RegisterStep1 from './pages/auth/RegisterStep1';
import RegisterStep2 from './pages/auth/RegisterStep2';

// Auctions
import AuctionList from './pages/auctions/AuctionList';
import AuctionDetail from './pages/auctions/AuctionDetail';
import AuctionRoom from './pages/auctions/AuctionRoom';

// User
import Profile from './pages/user/Profile';
import PaymentMethods from './pages/user/PaymentMethods';
import Messages from './pages/user/Messages';

// Submissions
import NewSubmission from './pages/submissions/NewSubmission';
import MySubmissions from './pages/submissions/MySubmissions';
import SubmissionDetail from './pages/submissions/SubmissionDetail';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAuctions from './pages/admin/AdminAuctions';
import AdminAuctionRoom from './pages/admin/AdminAuctionRoom';
import AdminSubmissions from './pages/admin/AdminSubmissions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/auctions" replace />} />

            {/* Auth */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<RegisterStep1 />} />
            <Route path="/auth/complete-registration" element={<RegisterStep2 />} />

            {/* Public */}
            <Route path="/auctions" element={<AuctionList />} />
            <Route path="/auctions/:id" element={<AuctionDetail />} />

            {/* Protected */}
            <Route path="/auctions/:id/room" element={<ProtectedRoute><AuctionRoom /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
            <Route path="/profile/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
            <Route path="/submissions/new" element={<ProtectedRoute><NewSubmission /></ProtectedRoute>} />
            <Route path="/submissions/:id" element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/auctions" element={<AdminRoute><AdminAuctions /></AdminRoute>} />
            <Route path="/admin/auctions/:id/room" element={<AdminRoute><AdminAuctionRoom /></AdminRoute>} />
            <Route path="/admin/submissions" element={<AdminRoute><AdminSubmissions /></AdminRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
