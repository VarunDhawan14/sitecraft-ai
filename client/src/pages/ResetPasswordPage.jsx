import { useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2Icon, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LoginLeft from "../components/LoginLeft";
import { useAppContext } from "../context/AppContext";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const { resetPassword } = useAppContext();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);

      navigate("/login");
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
              Create new password
            </h1>

            <p className='mt-3 text-base text-zinc-500'>
              Enter a new password for your SiteCraft AI account.
            </p>
          </div>

          {error && (
            <div className='mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600'>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
            <div>
              <label className='mb-2 block text-sm font-medium'>
                New password
              </label>

              <div className='relative'>
                <LockKeyhole
                  size={20}
                  className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400'
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder='Enter new password'
                  className='w-full rounded-xl border border-zinc-200 py-4 pl-12 pr-12 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
                />

                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700'
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium'>
                Confirm password
              </label>

              <input
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder='Confirm new password'
                className='w-full rounded-xl border border-zinc-200 px-4 py-4 text-sm outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 py-4 font-semibold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50'
            >
              {loading && (
                <Loader2Icon size={20} className='mr-2 animate-spin' />
              )}

              {loading ? "Updating..." : "Reset password"}
            </button>
          </form>

          <div className='mt-8 text-center'>
            <Link to='/login' className='font-medium text-orange-600'>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
