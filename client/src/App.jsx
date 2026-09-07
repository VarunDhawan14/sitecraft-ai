import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout, GuestLayout } from "./pages/Layout";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage";
import BuilderPage from "./pages/BuilderPage";
import PreviewPage from "./pages/PreviewPage";
import { Toaster } from "react-hot-toast";
import PublishPage from "./pages/PublishPage";
import ForgotPasswordPage from "./pages/ForgetPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Login Routes */}
        <Route element={<GuestLayout />}>
          <Route path='/login' element={<AuthPage mode='login' />} />
          <Route path='/register' element={<AuthPage mode='register' />} />
          <Route path='/forgot-password' element={<ForgotPasswordPage />} />
          <Route
            path='/reset-password/:token'
            element={<ResetPasswordPage />}
          />
          <Route path='/verify-email' element={<VerifyEmailPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<AuthLayout />}>
          <Route path='/' element={<HomePage />} />
          <Route path='/builder/:id' element={<BuilderPage />} />
          <Route path='/preview/:id' element={<PreviewPage />} />
        </Route>

        {/* Public Routes */}
        <Route path='/publish/:id' element={<PublishPage />} />

        {/* Catch-all */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </>
  );
};

export default App;
