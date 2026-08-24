import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import ActivityPage from "./pages/ActivityPage";
import ActivityDetailPage from "./pages/ActivityDetailPage";
import InstructorProfilePage from "./pages/InstructorProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InstructorDashboard from "./pages/InstructorDashboard";
import CreateClassPage from "./pages/CreateClassPage";
import EditClassPage from "./pages/EditClassPage";
import MyClassesPage from "./pages/MyClassesPage";
import ParentDashboard from "./pages/ParentDashboard";
import BookingPage from "./pages/BookingPage";
import AdminDashboard from "./pages/AdminDashboard";
import RequestClassPage from "./pages/RequestClassPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import BecomeInstructorPage from "./pages/BecomeInstructorPage";
import InstructorsPage from "./pages/InstructorsPage";
import MessagesPage from "./pages/MessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import CampsPage from "./pages/CampsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages — koi bhi dekh sakta hai */}
        <Route path="/" element={<Homepage />} />
        <Route path="/activities" element={<ActivityPage />} />
        <Route path="/activity/:id" element={<ActivityDetailPage />} />
        <Route path="/instructor/:id" element={<InstructorProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/request-class" element={<RequestClassPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faqs" element={<FAQPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/become-instructor" element={<BecomeInstructorPage />} />
        <Route path="/instructors" element={<InstructorsPage />} />
        <Route path="/camps" element={<CampsPage />} />

        {/* Instructor-only pages */}
        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute role="instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/create-class"
          element={
            <ProtectedRoute role="instructor">
              <CreateClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/edit-class/:id"
          element={
            <ProtectedRoute role="instructor">
              <EditClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/my-classes"
          element={
            <ProtectedRoute role="instructor">
              <MyClassesPage />
            </ProtectedRoute>
          }
        />

        {/* Parent-only pages */}
        <Route
          path="/parent/dashboard"
          element={
            <ProtectedRoute role="parent">
              <ParentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book/:id"
          element={
            <ProtectedRoute role="parent">
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/favorites" element={<FavoritesPage />} />

        {/* Any logged-in user — parent or instructor */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:userId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only page */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* No route matched — show a real 404 instead of a blank page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
