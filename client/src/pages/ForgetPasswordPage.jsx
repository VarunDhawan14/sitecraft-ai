import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2Icon, Mail } from "lucide-react";
import LoginLeft from "../components/LoginLeft";
import { useAppContext } from "../context/AppContext";

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAppContext();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await forgotPassword(email);

      setMessage(
        data.message ||
          "If an account exists with this email, a reset link has been sent.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex bg-[#f7f7f8] text-zinc-900'>
      <LoginLeft />

      <div className='flex flex-1 items-center justify-center px-6 py-10 lg:px-12'>
        <div className='w-full max-w-[690px] rounded-3xl border border-zinc-200 bg-white px-8 py-10 shadow-[0_20px_70px_rgba(0,0,0,0.08)] sm:px-10 lg:px-12'>
          <div className='text-center'>
            <h1 className='text-4xl font-semibold tracking-tight'>
              Forgot password?
            </h1>

            <p className='mt-3 text-base text-zinc-500'>
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {error && (
            <div className='mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600'>
              {error}
            </div>
          )}

          {message && (
            <div className='mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700'>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
            <div>
              <label className='mb-2 block text-sm font-medium text-zinc-800'>
                Email address
              </label>

              <div className='relative'>
                <Mail
                  size={20}
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400'
                />

                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder='you@example.com'
                  className='w-full rounded-xl border border-zinc-200 bg-white py-4 pl-12 pr-4 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading && (
                <Loader2Icon className='mr-2 animate-spin' size={20} />
              )}

              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className='mt-8 text-center'>
            <Link
              to='/login'
              className='font-medium text-orange-600 hover:text-orange-700'
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
