import React from "react";
import { Zap, Eye, Code2, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-Powered Generation",
    description: "Describe your idea and watch AI build it.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description: "See changes in real-time as you build.",
  },
  {
    icon: Code2,
    title: "Clean Export",
    description: "Export production-ready code instantly.",
  },
];

const LoginLeft = () => {
  return (
    <div
      className="
        hidden lg:flex
        lg:w-[46%]
        relative
        overflow-hidden
        bg-[url('/bg-img.png')]
        bg-cover
        bg-center
        bg-no-repeat
        flex-col
        justify-between
        p-14
        shrink-0
        select-none
      "
    >
      {/* Logo */}
      <div className='relative z-10 flex items-center gap-3'>
        <img src='/logo.svg' alt='SiteCraft AI' className='w-10 h-10' />

        <span className='text-[32px] font-medium text-white tracking-tight'>
          SiteCraft <span className='text-orange-400'>AI</span>
        </span>
      </div>

      {/* Main Content */}
      <div className='relative z-10 mb-10'>
        <h2 className='text-5xl font-semibold leading-[1.15] tracking-tight text-white'>
          Build. Preview.
          <br />
          Publish.{" "}
          <span className='bg-gradient to-red from-pink-500 to-orange-400 bg-clip-text text-transparent'>
            Instantly.
          </span>
        </h2>

        <p className='mt-7 max-w-md text-lg leading-8 text-zinc-300'>
          Create stunning websites with AI.
          <br />
          Real-time editing, clean code,
          <br />
          and seamless exports.
        </p>

        {/* Features */}
        <div className='mt-10 space-y-6'>
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className='flex items-center gap-4'>
                <div
                  className='
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/10
                    bg-white/10
                    backdrop-blur-sm
                  '
                >
                  <Icon size={24} className='text-white' />
                </div>

                <div>
                  <h3 className='text-base font-semibold text-white'>
                    {feature.title}
                  </h3>

                  <p className='mt-1 text-sm text-zinc-400'>
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust Badge */}
      <div className='relative z-10'>
        <div
          className='
            inline-flex
            items-center
            gap-4
            rounded-xl
            border
            border-white/10
            bg-black/10
            px-5
            py-4
            backdrop-blur-sm
          '
        >
          <ShieldCheck size={24} className='text-zinc-200' />

          <div>
            <p className='text-sm font-medium text-white'>
              Trusted by builders worldwide
            </p>

            <p className='mt-1 text-xs text-zinc-400'>
              Secure. Fast. Reliable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginLeft;
