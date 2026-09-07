import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2Icon, Mail } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const { verifyEmail, resendVerificationCode } = useAppContext();

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    try {
      await verifyEmail(email, code);
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setResending(true);

    try {
      await resendVerificationCode(email);
    } catch (err) {
      setError(err.message || "Unable to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f7f8] px-6'>
      <div className='w-full max-w-md rounded-3xl border border-zinc-200 bg-white px-8 py-10 shadow-[0_20px_70px_rgba(0,0,0,0.08)]'>
        <div className='text-center'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100'>
            <Mail className='text-orange-600' size={26} />
          </div>

          <h1 className='mt-6 text-3xl font-semibold text-zinc-900'>
            Verify your email
          </h1>

          <p className='mt-3 text-sm leading-6 text-zinc-500'>
            We sent a 6-digit verification code to your email address.
          </p>
        </div>

        {error && (
          <div className='mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600'>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className='mt-8 space-y-5'>
          <div>
            <label className='mb-2 block text-sm font-medium text-zinc-800'>
              Email address
            </label>

            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder='you@example.com'
              className='w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-zinc-800'>
              Verification code
            </label>

            <input
              type='text'
              inputMode='numeric'
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              placeholder='123456'
              className='w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-105 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading && <Loader2Icon className='mr-2 animate-spin' size={20} />}

            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className='mt-6 text-center'>
          <button
            type='button'
            onClick={handleResend}
            disabled={resending}
            className='cursor-pointer text-sm font-medium text-orange-600 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {resending ? "Sending..." : "Resend verification code"}
          </button>
        </div>

        <div className='mt-8 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center text-sm text-zinc-500'>
          Already verified?{" "}
          <Link
            to='/login'
            className='font-medium text-orange-600 hover:text-orange-700'
          >
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
