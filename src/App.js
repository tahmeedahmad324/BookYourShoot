import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/common/Navbar"
import Footer from "./components/common/Footer"
import ProtectedRoute from "./components/common/ProtectedRoute"
import AIChatbot from "./components/common/AIChatbot"
import ScrollToTop from "./components/common/ScrollToTop"

// Public Pages
import LandingPage from "./pages/public/LandingPage"
import Landing from "./pages/Landing"
import SearchResults from "./pages/SearchResults"
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import CNICUpload from "./pages/auth/CNICUpload"
import OTPVerification from "./pages/auth/OTPVerification"
import PhotographerSearch from "./pages/public/PhotographerSearch"
import PhotographerProfileSetup from "./pages/photographer/PhotographerProfileSetup"
import Profile from "./pages/Profile"
import ForgotPassword from "./pages/auth/ForgotPassword"
import TermsAndConditions from "./pages/legal/TermsAndConditions"
import PrivacyPolicy from "./pages/legal/PrivacyPolicy"
import Support from "./pages/help/Support"
import Contact from "./pages/help/Contact"

// Client Pages
import ClientDashboard from "./pages/client/ClientDashboard"
import ClientProfile from "./pages/client/ClientProfile"
import PhotographerProfile from "./pages/client/PhotographerProfile"
import BookingRequest from "./pages/client/BookingRequest"
import BookingSuccess from "./pages/client/BookingSuccess"
import ClientBookings from "./pages/client/ClientBookings"
import ClientChat from "./pages/client/ClientChat"
import ReviewSubmission from "./pages/client/ReviewSubmission"
import AlbumBuilder from "./pages/client/AlbumBuilder"
import ReelGenerator from "./pages/client/ReelGenerator"
import MusicDiscoveryUI from "./pages/client/MusicDiscoveryUI"
import PaymentTestPage from "./pages/PaymentTestPage"
import EscrowDemoPage from "./pages/EscrowDemoPage"
import BookingSummaryDemo from "./pages/BookingSummaryDemo"

// Photographer Pages
import PhotographerDashboard from "./pages/photographer/PhotographerDashboard"
import PhotographerProfilePage from "./pages/photographer/PhotographerProfile"
import BookingRequests from "./pages/photographer/BookingRequests"
import EquipmentList from "./pages/photographer/EquipmentList"
import EquipmentDetail from "./pages/photographer/EquipmentDetail"
import MyEquipmentListings from "./pages/photographer/MyEquipmentListings"
import TravelEstimator from "./pages/photographer/TravelEstimator"

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminVerifications from "./pages/admin/AdminVerifications"
import AdminComplaints from "./pages/admin/AdminComplaints"
import AdminSettings from "./pages/admin/AdminSettings"
import AdminReportedReviews from "./pages/admin/AdminReportedReviews"
import AdminPlatformSettings from "./pages/admin/AdminPlatformSettings"

// Context Providers
import { AuthProvider } from "./context/AuthContext"

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/search" element={<PhotographerSearch />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/search-results" element={<SearchResults />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/support" element={<Support />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/payment-test" element={<PaymentTestPage />} />
              <Route path="/escrow-demo" element={<EscrowDemoPage />} />
              <Route path="/booking-summary-demo" element={<BookingSummaryDemo />} />

              {/* Protected Client Routes */}
              <Route
                path="/client/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/:id"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <PhotographerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/request/:id"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <BookingRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/success"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <BookingSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/bookings"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/chat/:id"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientChat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/review/:id"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ReviewSubmission />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/album-builder"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <AlbumBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/reel-generator"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ReelGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/music-discovery"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <MusicDiscoveryUI />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/music-suggestion"
                element={<Navigate to="/client/music-discovery" replace />}
              />
              <Route
                path="/client/profile"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientProfile />
                  </ProtectedRoute>
                }
              />

              {/* Protected Photographer Routes */}
              <Route
                path="/photographer/profile-setup"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <PhotographerProfileSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <PhotographerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/profile"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <PhotographerProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/bookings"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <BookingRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/equipment"
                element={
                  <ProtectedRoute allowedRoles={["photographer", "client"]}>
                    <EquipmentList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/equipment/:id"
                element={
                  <ProtectedRoute allowedRoles={["photographer", "client"]}>
                    <EquipmentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/my-equipment-listings"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <MyEquipmentListings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photographer/travel"
                element={
                  <ProtectedRoute allowedRoles={["photographer"]}>
                    <TravelEstimator />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verifications"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminVerifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/complaints"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminComplaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reported-reviews"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminReportedReviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/platform-settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPlatformSettings />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Routes */}
              <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/photographer" element={<Navigate to="/photographer/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* 404 Page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <AIChatbot />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
