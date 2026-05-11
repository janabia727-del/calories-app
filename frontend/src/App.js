import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import QuestionBank from "@/pages/QuestionBank";
import Quizzes from "@/pages/Quizzes";
import Worksheets from "@/pages/Worksheets";
import LessonPlans from "@/pages/LessonPlans";
import Grading from "@/pages/Grading";
import Classes from "@/pages/Classes";
import Reports from "@/pages/Reports";
import Assistant from "@/pages/Assistant";
import LiveHub from "@/pages/LiveHub";
import LivePresenter from "@/pages/LivePresenter";
import StudentJoin from "@/pages/StudentJoin";
import StudentPlay from "@/pages/StudentPlay";

function AppRouter() {
  const location = useLocation();
  // Synchronous check for OAuth callback — handle BEFORE ProtectedRoute mounts.
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/join" element={<StudentJoin />} />
      <Route path="/play/:code" element={<StudentPlay />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
      <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
      <Route path="/worksheets" element={<ProtectedRoute><Worksheets /></ProtectedRoute>} />
      <Route path="/lesson-plans" element={<ProtectedRoute><LessonPlans /></ProtectedRoute>} />
      <Route path="/grading" element={<ProtectedRoute><Grading /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute><LiveHub /></ProtectedRoute>} />
      <Route path="/live/:code" element={<ProtectedRoute><LivePresenter /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster richColors position="top-center" />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </div>
  );
}
