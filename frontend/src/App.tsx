import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Layout from './Layout';
import Users from './pages/Users';
import Submissions from './pages/Submissions';
import PaymentMethods from './pages/PaymentMethods';
import Duenios from './pages/Duenios';
import Auctions from './pages/Auctions';
import Purchases from './pages/Purchases';
import ProfileRequests from './pages/ProfileRequests';
import { getStoredUser, getUsers, getSubmissions, getPaymentMethods, getProfileChangeRequests } from './api';

export default function App() {
  const [isAuth, setIsAuth] = useState(!!getStoredUser());
  const [pendingUsers, setPendingUsers] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingProfileRequests, setPendingProfileRequests] = useState(0);

  useEffect(() => {
    if (!isAuth) return;
    // Load badge counts
    getUsers('pendiente')
      .then((d) => setPendingUsers(d.total ?? d.users.length))
      .catch(() => {});
    getSubmissions('pendiente_empresa')
      .then((d) => setPendingSubmissions(d.submissions.length))
      .catch(() => {});
    getPaymentMethods('pendiente')
      .then((d) => setPendingPayments(d.paymentMethods.length))
      .catch(() => {});
    getProfileChangeRequests('pendiente')
      .then((d) => setPendingProfileRequests(d.requests.length))
      .catch(() => {});
  }, [isAuth]);

  if (!isAuth) {
    return <Login onLogin={() => setIsAuth(true)} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout
            onLogout={() => setIsAuth(false)}
            pendingUsers={pendingUsers}
            pendingSubmissions={pendingSubmissions}
            pendingPayments={pendingPayments}
            pendingProfileRequests={pendingProfileRequests}
          />
        }>
        <Route index element={<Navigate to="/users" replace />} />
        <Route path="users" element={<Users onCountChange={setPendingUsers} />} />
        <Route path="submissions" element={<Submissions onCountChange={setPendingSubmissions} />} />
        <Route path="payment-methods" element={<PaymentMethods onCountChange={setPendingPayments} />} />
        <Route path="profile-requests" element={<ProfileRequests onCountChange={setPendingProfileRequests} />} />
        <Route path="duenios" element={<Duenios />} />
        <Route path="auctions" element={<Auctions />} />
        <Route path="purchases" element={<Purchases />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
