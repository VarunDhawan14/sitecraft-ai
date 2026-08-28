import { useState } from "react";
import LoginLeft from "../components/LoginLeft";
import { Link, useNavigate } from "react-router-dom";

import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  Mail,
  LockKeyhole,
} from "lucide-react";

import { useAppContext } from "../context/AppContext";

const AuthPage = ({ mode }) => {
  const { login, register } = useAppContext();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }

      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          (isLogin
            ? "Invalid email or password"
            : "Registration failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f7f7f8] text-zinc-900">

      {/* Left Branding Panel */}
      <LoginLeft />

      {/* Right Side */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">

        <div
          className="
            w-full
            max-w-[690px]
            rounded-3xl
            border
            border-zinc-200
            bg-white
            px-8
            py-10
            shadow-[0_20px_70px_rgba(0,0,0,0.08)]
            sm:px-10
            lg:px-12
          "
        >

          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
              {isLogin
                ? "Welcome back"
                : "Create your account"}
            </h1>

            <p className="mt-3 text-base text-zinc-500">
              {isLogin
                ? "Sign in to your SiteCraft AI account"
                : "Start building with SiteCraft AI today"}
            </p>
          </div>

          {/* Login / Register Tabs */}
          <div className="mt-10 grid grid-cols-2 border-b border-zinc-200">

            <Link
              to="/login"
              className={`
                relative
                py-4
                text-center
                text-base
                font-medium
                transition
                ${
                  isLogin
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              `}
            >
              Sign in

              {isLogin && (
                <span className="
                  absolute
                  bottom-0
                  left-0
                  h-[3px]
                  w-full
                  rounded-full
                  bg-gradient-to-r
                  from-pink-600
                  to-orange-500
                "
                />
              )}
            </Link>

            <Link
              to="/register"
              className={`
                relative
                py-4
                text-center
                text-base
                font-medium
                transition
                ${
                  !isLogin
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              `}
            >
              Create account

              {!isLogin && (
                <span className="
                  absolute
                  bottom-0
                  left-0
                  h-[3px]
                  w-full
                  rounded-full
                  bg-gradient-to-r
                  from-pink-600
                  to-orange-500
                "
                />
              )}
            </Link>

          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >

            {/* Name - Only Register */}
            {!isLogin && (
              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Full name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Varun Dhawan"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-zinc-200
                    bg-white
                    px-4
                    py-4
                    text-sm
                    outline-none
                    transition
                    placeholder:text-zinc-400
                    focus:border-pink-500
                    focus:ring-4
                    focus:ring-pink-500/10
                  "
                />

              </div>
            )}

            {/* Email */}
            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Email address
              </label>

              <div className="relative">

                <Mail
                  size={20}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-zinc-400
                  "
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-zinc-200
                    bg-white
                    py-4
                    pl-12
                    pr-4
                    text-sm
                    outline-none
                    transition
                    placeholder:text-zinc-400
                    focus:border-pink-500
                    focus:ring-4
                    focus:ring-pink-500/10
                  "
                />

              </div>

            </div>

            {/* Password */}
            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={20}
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-zinc-400
                  "
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-zinc-200
                    bg-white
                    py-4
                    pl-12
                    pr-12
                    text-sm
                    outline-none
                    transition
                    placeholder:text-zinc-400
                    focus:border-pink-500
                    focus:ring-4
                    focus:ring-pink-500/10
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-zinc-400
                    hover:text-zinc-700
                    transition
                    cursor-pointer
                  "
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </button>

              </div>

            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end">

                <button
                  type="button"
                  className="
                    text-sm
                    font-medium
                    text-orange-600
                    hover:text-orange-700
                    transition
                    cursor-pointer
                  "
                >
                  Forgot password?
                </button>

              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="
                flex
                w-full
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-r
                from-pink-600
                via-red-500
                to-orange-500
                py-4
                text-base
                font-semibold
                text-white
                shadow-lg
                shadow-orange-500/20
                transition
                hover:brightness-105
                hover:scale-[1.01]
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
                cursor-pointer
              "
            >

              {loading && (
                <Loader2Icon
                  className="mr-2 animate-spin"
                  size={20}
                />
              )}

              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign in"
                : "Create account"}

            </button>

          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">

            <div className="h-px flex-1 bg-zinc-200" />

            <span className="text-sm text-zinc-400">
              or continue with
            </span>

            <div className="h-px flex-1 bg-zinc-200" />

          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">

            <button
              type="button"
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-zinc-200
                bg-white
                py-4
                text-sm
                font-medium
                text-zinc-700
                transition
                hover:bg-zinc-50
                cursor-pointer
              "
            >
              <span className="text-lg font-bold text-red-500">
                G
              </span>

              Google
            </button>

            <button
              type="button"
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-zinc-200
                bg-white
                py-4
                text-sm
                font-medium
                text-zinc-700
                transition
                hover:bg-zinc-50
                cursor-pointer
              "
            >
              <span className="text-lg font-bold">
                ◉
              </span>

              GitHub
            </button>

          </div>

          {/* Bottom Link */}
          <div className="
            mt-8
            rounded-xl
            border
            border-zinc-100
            bg-zinc-50
            px-5
            py-5
            text-center
            text-sm
            text-zinc-500
          ">

            {isLogin ? (
              <>
                Don’t have an account?{" "}

                <Link
                  to="/register"
                  className="
                    font-medium
                    text-orange-600
                    hover:text-orange-700
                  "
                >
                  Create an account →
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}

                <Link
                  to="/login"
                  className="
                    font-medium
                    text-orange-600
                    hover:text-orange-700
                  "
                >
                  Sign in →
                </Link>
              </>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;