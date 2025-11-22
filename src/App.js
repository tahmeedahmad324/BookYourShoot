import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import Landing from './pages/Landing';
import SearchResults from './pages/SearchResults';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CNICUpload from './pages/auth/CNICUpload';
import OTPVerification from './pages/auth/OTPVerification';
import PhotographerSearch from './pages/public/PhotographerSearch';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import PhotographerProfile from './pages/client/PhotographerProfile';
import BookingRequest from './pages/client/BookingRequest';
import ClientBookings from './pages/client/ClientBookings';
import ClientChat from './pages/client/ClientChat';
import ReviewSubmission from './pages/client/ReviewSubmission';
import AlbumBuilder from './pages/client/AlbumBuilder';
import ReelGenerator from './pages/client/ReelGenerator';
import MusicSuggestion from './pages/client/MusicSuggestion';

// Photographer Pages
import PhotographerDashboard from './pages/photographer/PhotographerDashboard';
import BookingRequests from './pages/photographer/BookingRequests';
import EquipmentList from './pages/photographer/EquipmentList';
import TravelEstimator from './pages/photographer/TravelEstimator';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Context Providers
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="min-vh-100">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/landing-old" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/cnic" element={<CNICUpload />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
              <Route path="/search" element={<PhotographerSearch />} />

              {/* Protected Client Routes */}
              <Route path="/client/dashboard" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/photographer/:id" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <PhotographerProfile />
                </ProtectedRoute>
              } />
              <Route path="/booking/request/:id" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <BookingRequest />
                </ProtectedRoute>
              } />
              <Route path="/client/bookings" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientBookings />
                </ProtectedRoute>
              } />
              <Route path="/client/chat/:id" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientChat />
                </ProtectedRoute>
              } />
              <Route path="/client/review/:id" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ReviewSubmission />
                </ProtectedRoute>
              } />
              <Route path="/client/album-builder" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <AlbumBuilder />
                </ProtectedRoute>
              } />
              <Route path="/client/reel-generator" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ReelGenerator />
                </ProtectedRoute>
              } />
              <Route path="/client/music-suggestion" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <MusicSuggestion />
                </ProtectedRoute>
              } />

              {/* Protected Photographer Routes */}
              <Route path="/photographer/dashboard" element={
                <ProtectedRoute allowedRoles={['photographer']}>
                  <PhotographerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/photographer/bookings" element={
                <ProtectedRoute allowedRoles={['photographer']}>
                  <BookingRequests />
                </ProtectedRoute>
              } />
              <Route path="/photographer/equipment" element={
                <ProtectedRoute allowedRoles={['photographer']}>
                  <EquipmentList />
                </ProtectedRoute>
              } />
              <Route path="/photographer/travel" element={
                <ProtectedRoute allowedRoles={['photographer']}>
                  <TravelEstimator />
                </ProtectedRoute>
              } />

              {/* Protected Admin Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Fallback Routes */}
              <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/photographer" element={<Navigate to="/photographer/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              
              {/* 404 Page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;