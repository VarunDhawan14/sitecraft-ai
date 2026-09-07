import PromptInput from "../components/PromptInput";
import { useAppContext } from "../context/AppContext";
import { homeTags } from "../assets/assets";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ClockIcon,
  TrashIcon,
  SparklesIcon,
  LayoutDashboardIcon,
  UserIcon,
  MailIcon,
  SendIcon,
} from "lucide-react";
import moment from "moment";
import api from "../api/api";

const HomePage = () => {
  const navigate = useNavigate();

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [contactLoading, setContactLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const {
    user,
    projects,
    loadingProjects,
    generatingProject,
    loadProjects,
    logout,
    handleGenerate,
    handleDelete,
  } = useAppContext();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      return;
    }

    setContactLoading(true);
    setContactSent(false);

    try {
      await api.post("/api/contact", contactForm);

      setContactSent(true);

      setContactForm({
        name: "",
        email: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact form failed:", error);
    } finally {
      setContactLoading(false);
    }
  };

  /*
   * Duplicate the tags so the marquee can continuously
   * scroll horizontally without leaving an empty space.
   */
  const marqueeTags = [...homeTags, ...homeTags];

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className='min-h-screen overflow-y-auto text-white font-sans'
      style={{
        background:
          "radial-gradient(circle at 50% 100%, #f86a08 0%, #f20b20 22%, #b90035 48%, #5a0023 72%, #2d0118 100%)",
      }}
    >
      {/* ================= NAVBAR ================= */}

      <nav className='sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#210318]/35 px-6 py-4 backdrop-blur-xl'>
        {/* Logo */}
        <button
          onClick={scrollToTop}
          className='flex cursor-pointer items-center gap-2'
        >
          <img
            src='/logo.png'
            alt='SiteCraft AI'
            className='size-8 object-contain'
          />

          <span className='text-xl font-semibold tracking-tight'>
            SiteCraft AI
          </span>
        </button>

        {/* Center Navigation */}
        <div className='hidden items-center gap-9 text-sm font-medium text-white/60 md:flex'>
          <button
            onClick={scrollToTop}
            className='relative cursor-pointer py-2 text-white'
          >
            Home
            <span className='absolute -bottom-[7px] left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500' />
          </button>

          <button
            onClick={() => scrollToSection("projects")}
            className='cursor-pointer py-2 transition hover:text-white'
          >
            My Projects
          </button>

          <button
            onClick={() => scrollToSection("about")}
            className='cursor-pointer py-2 transition hover:text-white'
          >
            About
          </button>

          <button
            onClick={() => scrollToSection("contact")}
            className='cursor-pointer py-2 transition hover:text-white'
          >
            Contact Us
          </button>
        </div>

        {/* User */}
        <div className='flex items-center gap-4 text-sm font-medium'>
          <div className='hidden items-center gap-2 text-white md:flex'>
            <UserIcon size={15} className='text-white/60' />

            <span>{user?.name || "User"}</span>
          </div>

          <button
            onClick={logout}
            className='cursor-pointer rounded-lg border border-white/20 bg-transparent px-4 py-2 text-xs text-white transition hover:bg-white/10'
          >
            Signout
          </button>
        </div>
      </nav>

      {/* ================= HERO ================= */}

      <div className='flex flex-col items-center px-6 pb-20 pt-8 xl:pt-20'>
        <div className='flex w-full max-w-2xl flex-col items-center'>
          {/* AI Badge */}

          <div className='flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 pr-3 text-[13px] text-white/90 backdrop-blur-md'>
            <span className='flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide'>
              <SparklesIcon size={12} />
              AI-POWERED
            </span>

            <span>Website Builder</span>
          </div>

          {/* Main Heading */}

          <h1 className='mt-6 max-w-3xl text-center text-4xl font-extrabold leading-[1.02] tracking-tight text-white md:text-6xl'>
            Turn your ideas
            <br />
            into{" "}
            <span className='bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent'>
              stunning websites
            </span>
          </h1>

          {/* Description */}

          <p className='mt-5 max-w-xl text-center text-sm leading-relaxed text-white/65 md:text-base'>
            Describe your idea and watch AI design, structure and launch your
            website instantly. No coding required.
          </p>

          {/* ================= GLASS PROMPT INPUT ================= */}

          <div className='mt-6 w-full'>
            <PromptInput
              onSubmit={handleGenerate}
              loading={generatingProject}
              placeholder='Describe the website you want to create...'
              variant='glass'
              autoFocus
            />
          </div>

          {/* ================= HORIZONTAL MARQUEE ================= */}

          <div className='masked-marquee mt-4 w-full max-w-3xl overflow-hidden py-1'>
            <div className='animate-marquee gap-3'>
              {marqueeTags.map((tag, i) => (
                <button
                  key={`${tag}-${i}`}
                  onClick={() => handleGenerate(tag)}
                  disabled={generatingProject}
                  className='flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                >
                  {i % 5 === 0 && <UserIcon size={13} />}

                  {i % 5 === 1 && <LayoutDashboardIcon size={13} />}

                  {i % 5 === 2 && <ArrowRightIcon size={13} />}

                  {i % 5 === 3 && <SparklesIcon size={13} />}

                  {i % 5 === 4 && <MailIcon size={13} />}

                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ================= PROJECTS ================= */}

          {!loadingProjects && projects.length > 0 && (
            <div id='projects' className='mt-14 w-full scroll-mt-24'>
              {/* Header */}

              <div className='mb-4 flex items-center justify-between border-b border-white/10 pb-3'>
                <p className='text-xs font-medium uppercase tracking-widest text-zinc-100'>
                  All Projects
                </p>

                <span className='text-xs font-normal text-zinc-100'>
                  {projects.length}
                  {projects.length === 1 ? " project" : " projects"}
                </span>
              </div>

              {/* Project List */}

              <div className='max-h-[80vh] space-y-2 overflow-y-auto pr-1'>
                {projects.map((project) => (
                  <div
                    key={project._id}
                    className='group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10'
                    onClick={() => navigate(`/builder/${project._id}`)}
                  >
                    {/* Project Info */}

                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-white'>
                        {project.name}
                      </p>

                      <div className='mt-0.5 flex items-center gap-3'>
                        <span className='flex items-center gap-1 text-xs text-zinc-300'>
                          <ClockIcon size={10} />

                          {moment(
                            project.updatedAt || project.createdAt,
                          ).fromNow()}
                        </span>

                        <span className='text-xs font-medium text-white/60'>
                          v{project.version}
                        </span>
                      </div>
                    </div>

                    {/* Project Actions */}

                    <div className='flex items-center gap-2'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project._id);
                        }}
                        className='cursor-pointer rounded-md p-1.5 text-zinc-200 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100'
                      >
                        <TrashIcon size={18} />
                      </button>

                      <ArrowRightIcon
                        size={18}
                        className='text-zinc-200 transition group-hover:text-white'
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= CONTACT ================= */}

      <section id='contact' className='scroll-mt-24 px-6 pb-6 pt-12 md:pt-16'>
        <div className='mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#090308] shadow-2xl'>
          <div className='grid min-h-[560px] md:grid-cols-2'>
            {/* ================= LEFT — SPLIT GRADIENT ================= */}

            <div className='relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#ff3b18] via-[#d90036] to-[#390017] p-8 md:p-12'>
              {/* Decorative Glow */}

              <div className='pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl' />

              <div className='pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl' />

              {/* Curved dark shape */}

              <div className='pointer-events-none absolute -right-40 top-1/2 h-[650px] w-[650px] -translate-y-1/2 rounded-full border border-white/10 bg-[#10030b]/30' />

              <div className='relative z-10'>
                {/* Small Label */}

                <p className='mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-white/60'>
                  Contact Us
                </p>

                {/* Heading */}

                <h2 className='max-w-md text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl'>
                  We'd Love
                  <br />
                  to Hear From You
                </h2>

                <p className='mt-6 max-w-md text-sm leading-6 text-white/65 md:text-base'>
                  Have a question, suggestion, or just want to say hello? Drop
                  us a message and our team will get back to you soon.
                </p>

                {/* ================= STATS ================= */}
                <div className='mt-16 max-w-xl'>
                  <p className='mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/60'>
                    What can we help with?
                  </p>

                  <div className='grid grid-cols-3 gap-8'>
                    <div>
                      <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white'>
                        ?
                      </div>
                      <h3 className='text-sm font-semibold text-white'>
                        Questions
                      </h3>
                      <p className='mt-2 text-xs leading-5 text-white/55'>
                        Product, features or general inquiries.
                      </p>
                    </div>

                    <div>
                      <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white'>
                        ✦
                      </div>
                      <h3 className='text-sm font-semibold text-white'>
                        Feedback
                      </h3>
                      <p className='mt-2 text-xs leading-5 text-white/55'>
                        Share ideas that help us improve.
                      </p>
                    </div>

                    <div>
                      <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white'>
                        ↗
                      </div>
                      <h3 className='text-sm font-semibold text-white'>
                        Partnerships
                      </h3>
                      <p className='mt-2 text-xs leading-5 text-white/55'>
                        Let's build something together.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= LOGO ================= */}

              <div className='relative z-10 mt-12 flex items-center gap-3'>
                <img
                  src='/logo.png'
                  alt='SiteCraft AI'
                  className='h-10 w-10 object-contain'
                />

                <div>
                  <p className='text-sm font-semibold text-white'>
                    SiteCraft AI
                  </p>

                  <p className='text-xs text-white/45'>
                    Build. Preview. Publish.
                  </p>
                </div>
              </div>
            </div>

            {/* ================= RIGHT — DARK FORM ================= */}

            <div className='flex items-center bg-[#0b0509] p-6 md:p-10'>
              <form onSubmit={handleContactSubmit} className='w-full'>
                {/* Form Heading */}

                <div className='mb-8'>
                  <p className='text-xs font-medium uppercase tracking-[0.2em] text-white/30'>
                    Get in touch
                  </p>

                  <h3 className='mt-2 text-2xl font-semibold tracking-tight text-white'>
                    Send us a message
                  </h3>

                  <p className='mt-2 text-sm text-white/35'>
                    Fill out the form and we'll get back to you.
                  </p>
                </div>

                {/* ================= NAME ================= */}

                <div className='mb-5'>
                  <label className='mb-2 block text-xs font-medium text-white/55'>
                    Name
                  </label>

                  <input
                    type='text'
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder='Your name'
                    className='w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 hover:border-white/15 focus:border-pink-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-pink-500/10'
                    required
                  />
                </div>

                {/* ================= EMAIL ================= */}

                <div className='mb-5'>
                  <label className='mb-2 block text-xs font-medium text-white/55'>
                    Email
                  </label>

                  <input
                    type='email'
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder='you@example.com'
                    className='w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 hover:border-white/15 focus:border-pink-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-pink-500/10'
                    required
                  />
                </div>

                {/* ================= MESSAGE ================= */}

                <div className='mb-5'>
                  <label className='mb-2 block text-xs font-medium text-white/55'>
                    Message
                  </label>

                  <textarea
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    placeholder='Tell us what you have in mind...'
                    rows={6}
                    className='w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 hover:border-white/15 focus:border-pink-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-pink-500/10'
                    required
                  />
                </div>

                {/* ================= SEND BUTTON ================= */}

                <button
                  type='submit'
                  disabled={contactLoading}
                  className='group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-950/20 transition hover:scale-[1.01] hover:shadow-xl hover:shadow-pink-950/30 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {contactLoading ? "Sending..." : "Send Message"}

                  {!contactLoading && (
                    <SendIcon
                      size={16}
                      className='transition-transform group-hover:translate-x-1'
                    />
                  )}
                </button>

                {/* Success Message */}

                {contactSent && (
                  <div className='mt-4 rounded-lg border border-green-500/10 bg-green-500/5 px-4 py-3 text-center'>
                    <p className='text-xs font-medium text-green-400'>
                      Message sent successfully. We'll get back to you soon.
                    </p>
                  </div>
                )}

                <p className='mt-4 text-center text-[11px] text-white/20'>
                  Your message is sent securely to the SiteCraft AI team.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer
        id='footer'
        className='mt-20 border-t border-white/10 bg-[#0d0208] px-6 py-16 text-white'
      >
        <div className='mx-auto max-w-7xl'>
          <div className='grid gap-12 md:grid-cols-2 lg:grid-cols-4'>
            {/* ================= BRAND ================= */}

            <div>
              <div className='mb-5 flex items-center gap-3'>
                <img
                  src='/logo.png'
                  alt='SiteCraft AI'
                  className='h-10 w-10 object-contain'
                />

                <span className='text-xl font-semibold tracking-tight'>
                  SiteCraft AI
                </span>
              </div>

              <p className='max-w-xs text-sm leading-6 text-white/40'>
                Build stunning websites with AI. Turn your ideas into
                responsive, production-ready websites in minutes.
              </p>
            </div>

            {/* ================= QUICK LINKS ================= */}

            <div>
              <h3 className='mb-5 text-sm font-semibold text-white'>
                Quick Links
              </h3>

              <div className='space-y-3 text-sm text-white/40'>
                <button
                  onClick={scrollToTop}
                  className='block cursor-pointer transition hover:text-white'
                >
                  Home
                </button>

                <button
                  onClick={() => scrollToSection("projects")}
                  className='block cursor-pointer transition hover:text-white'
                >
                  My Projects
                </button>

                <button
                  onClick={() => scrollToSection("about")}
                  className='block cursor-pointer transition hover:text-white'
                >
                  About
                </button>

                <button
                  onClick={() => scrollToSection("contact")}
                  className='block cursor-pointer transition hover:text-white'
                >
                  Contact Us
                </button>
              </div>
            </div>

            {/* ================= ABOUT ================= */}

            <div id='about' className='scroll-mt-24'>
              <div className='mb-5 flex items-center gap-2'>
                <img
                  src='/logo.png'
                  alt=''
                  className='h-6 w-6 object-contain'
                />

                <h3 className='text-sm font-semibold text-white'>
                  About SiteCraft AI
                </h3>
              </div>

              <p className='max-w-xs text-sm leading-6 text-white/40'>
                SiteCraft AI is an AI-powered website builder that transforms
                simple ideas and natural-language prompts into beautiful
                websites without requiring coding.
              </p>

              <p className='mt-4 text-xs leading-5 text-white/25'>
                Describe your idea. Let AI build it.
              </p>
            </div>

            {/* ================= CONTACT ================= */}

            <div>
              <h3 className='mb-5 text-sm font-semibold text-white'>
                Contact Us
              </h3>

              <p className='mb-3 text-sm leading-6 text-white/40'>
                Have a question, suggestion or feedback?
              </p>

              <button
                onClick={() => scrollToSection("contact")}
                className='cursor-pointer text-sm text-white/50 transition hover:text-white'
              >
                Send us a message on :
              </button>

              <a
                href='mailto:sitecraftai94@gmail.com'
                className='mt-2 block text-sm text-white/35 transition hover:text-white'
              >
                sitecraftai94@gmail.com
              </a>
            </div>
          </div>

          {/* ================= BOTTOM ================= */}

          <div className='mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between'>
            <p className='text-xs text-white/25'>
              © 2026 SiteCraft AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ================= BOTTOM STATUS ================= */}

      <div className='fixed bottom-5 left-5 z-20'>
        <div className='flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md'>
          <span className='h-2 w-2 animate-pulse rounded-full bg-green-400' />

          <span className='text-[11px] font-medium text-white/75'>
            AI Ready
          </span>
        </div>
      </div>

      {/* ================= DECORATIVE TEXT ================= */}

      <div className='pointer-events-none fixed bottom-6 right-7 hidden rotate-[-6deg] text-right text-sm italic text-white/70 md:block'>
        <div>Build</div>

        <div>Without Limits</div>

        <div className='ml-auto mt-1 h-px w-16 rotate-[-4deg] bg-white/50' />
      </div>
    </div>
  );
};

export default HomePage;
