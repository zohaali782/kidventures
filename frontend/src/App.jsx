import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import ActivityPage from "./pages/ActivityPage";
import ActivityDetailPage from "./pages/ActivityDetailPage";
import InstructorProfilePage from "./pages/InstructorProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import InstructorDashboard from "./pages/InstructorDashboard";
import CreateClassPage from "./pages/CreateClassPage";
import MyClassesPage from "./pages/MyClassesPage";
import ParentDashboard from "./pages/ParentDashboard";
import BookingPage from "./pages/BookingPage";
import AdminDashboard from "./pages/AdminDashboard";
import RequestClassPage from "./pages/RequestClassPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProtectedRoute from "./components/ProtectedRoute";

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
        <Route path="/request-class" element={<RequestClassPage />} />

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

        {/* Admin-only page */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
