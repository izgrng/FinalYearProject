import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { MapPreview } from "../components/MapComponent";
import { useLanguage } from "../context/LanguageContext";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  MapPin,
  MessageCircle,
  Radar,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const Home = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const featureSteps = [
    {
      icon: <Camera className="h-6 w-6" />,
      title: "Capture the issue",
      description: "Report with text, image, or both, then pin the exact location on the map.",
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Let AI sort the signal",
      description: "Fixify classifies the issue, estimates urgency, and highlights possible duplicates.",
    },
    {
      icon: <ClipboardCheck className="h-6 w-6" />,
      title: "Track what happens next",
      description: "Follow issue progress, moderator review, community action, and dashboard visibility.",
    },
  ];

  const productLanes = [
    {
      icon: <Radar className="h-5 w-5" />,
      title: "Issue visibility",
      description: "See what is building up across neighborhoods instead of losing it in scattered posts.",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Community action",
      description: "Use the Community Hub to gather people around events, updates, and local follow-through.",
    },
    {
      icon: <Bot className="h-5 w-5" />,
      title: "AI support",
      description: "Get help from Fixi AI for reporting, category guidance, and clearer issue submission.",
    },
  ];

  const trustSignals = [
    { value: "Text + image", label: "Flexible reporting inputs" },
    { value: "Map-based", label: "Location-aware issue tracking" },
    { value: "Moderator flow", label: "Review to fixed lifecycle" },
    { value: "Community hub", label: "Events, posts, and coordination" },
  ];

  const heroSignals = [
    "Road and transport",
    "Waste and sanitation",
    "Water and drainage",
    "Public safety",
    "Community action",
    "AI triage",
  ];

  useEffect(() => {
    if (location.hash === "#how-it-works") {
      const section = document.getElementById("how-it-works");
      if (section) {
        window.setTimeout(() => {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background transition-colors dark:bg-slate-950">
      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(115deg, rgba(7, 16, 36, 0.92) 8%, rgba(8, 26, 52, 0.78) 42%, rgba(16, 63, 73, 0.72) 100%), url('/images/ktm.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-x-0 top-0 border-b border-white/10 bg-slate-950/20 backdrop-blur-sm">
          <div className="motion-banner py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/80">
            <div className="motion-banner-track">
              {[...heroSignals, ...heroSignals].map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-3 px-7">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-32">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
                <Globe className="h-4 w-4 text-cyan-300" />
                {t.heroBadge}
              </div>

              <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {t.heroTitle}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                {t.heroBody}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {user ? (
                  <Link to="/report">
                    <Button
                      size="lg"
                      className="h-12 rounded-full bg-white px-8 text-base font-medium text-slate-950 hover:bg-white/90"
                      data-testid="hero-report-btn"
                    >
                      {t.heroPrimaryLoggedIn}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="h-12 rounded-full bg-white px-8 text-base font-medium text-slate-950 hover:bg-white/90"
                      data-testid="hero-get-started-btn"
                    >
                      {t.heroPrimary}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/25 bg-white/5 px-8 text-base text-white hover:bg-white/10"
                    data-testid="hero-dashboard-btn"
                  >
                    {t.heroSecondary}
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Activity className="h-4 w-4 text-cyan-300" />
                    Live reporting
                  </div>
                  <p className="mt-2 text-sm text-slate-200">Capture issues as they happen and make them visible to others nearby.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <BarChart3 className="h-4 w-4 text-cyan-300" />
                    Hotspot insight
                  </div>
                  <p className="mt-2 text-sm text-slate-200">See where repeated problems are building up and which reports need attention.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Users className="h-4 w-4 text-cyan-300" />
                    Community follow-up
                  </div>
                  <p className="mt-2 text-sm text-slate-200">Move from issue awareness into volunteering, events, and local response.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr] lg:grid-cols-1 xl:grid-cols-[1.05fr_0.9fr]">
                <div className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 shadow-2xl shadow-black/30">
                  <img
                    src="/images/img1.jpg"
                    alt="Street-level civic issue captured by a resident"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                  <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-3">
                    <div className="rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-cyan-200 backdrop-blur">
                      Field signal
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur">
                      AI assisted
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-sm font-medium uppercase tracking-[0.12em] text-cyan-200">What Fixify is built around</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Real issues, real places, clearer community coordination.</h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">
                      The platform is strongest when it helps people move from "I saw something wrong" to "we know where it is and what needs attention."
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5 text-white shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
                      <Shield className="h-4 w-4" />
                      Product focus
                    </div>
                    <div className="mt-4 space-y-4">
                      {productLanes.map((lane) => (
                        <div key={lane.title} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            {lane.icon}
                            {lane.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{lane.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/8 shadow-xl backdrop-blur-md">
                    <img
                      src="/images/UID.png"
                      alt="Citizens using a digital platform to be seen and heard"
                      className="h-40 w-full object-cover"
                    />
                    <div className="space-y-2 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        From issue to action
                      </div>
                      <p className="text-sm leading-6 text-slate-200">
                        Not just reporting, but visibility, moderation, and a path into community follow-through.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="h-auto w-full">
            <path
              fill="hsl(var(--background))"
              d="M0,96L80,85.3C160,75,320,53,480,53.3C640,53,800,75,960,80C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            />
          </svg>
        </div>
      </section>

      <section className="bg-[#F4FBF9] py-16 transition-colors dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustSignals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-2xl border border-[#D7ECE7] bg-white/85 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:hover:shadow-teal-500/10"
              >
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">{signal.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{signal.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 transition-colors dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-200">
              <MessageCircle className="h-4 w-4" />
              {t.homeWhy}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Local issues are messy in real life. The platform should feel clearer than the problem.
            </h2>
            <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">
              Fixify is not just a place to upload complaints. It is meant to make local civic problems visible,
              structured, and easier to act on, whether someone is reporting a pothole, checking a hotspot, or planning a clean-up.
            </p>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  Exact location matters
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Reports and community activity are stronger when people can see where a problem is happening, not just read about it.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  AI should add context, not noise
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Categorization, urgency, and duplicate hints help users understand the issue faster without replacing human judgment.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <img src="/images/UID.png" alt="Citizen participation and identity" className="h-56 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Visible participation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Let people see who is reporting, following up, and contributing to local improvement.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:translate-y-10">
              <img src="/images/WIP.jpeg" alt="Community work in progress" className="h-56 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Shared follow-through</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A better platform gives the community somewhere to gather after the report is submitted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F4FBF9] py-20 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-cyan-200">
              <Sparkles className="h-4 w-4" />
              Why Fixify?
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Clear value for people who want more than a complaint box
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
              Fixify helps you report issues properly, understand what is happening nearby, and connect those reports with community action and visible follow-up.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[26px] border border-[#D7ECE7] bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">Precise reporting</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Add text, images, and exact locations so issues are clearer and easier for others to understand.
              </p>
            </div>
            <div className="rounded-[26px] border border-[#D7ECE7] bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">AI-supported clarity</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Get help with categorization, issue visibility, urgency hints, and guidance from Fixi AI.
              </p>
            </div>
            <div className="rounded-[26px] border border-[#D7ECE7] bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">Community follow-up</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Use the dashboard and Community Hub to move from reporting into local awareness, events, and action.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20 transition-colors dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              {t.homeHow}
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              A clearer path from reporting to response
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              The platform is designed around the real flow people expect: report the issue, understand it, and keep track of what happens next.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {featureSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[26px] border border-[#D7ECE7] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-cyan-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200">
                    {step.icon}
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 transition-colors dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Explore community reports on the map
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                Visualize how issues are spreading across the city and use the dashboard to understand where attention is building up.
              </p>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="rounded-full px-6">
                Open full dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 shadow-sm dark:border-slate-800">
                <div className="h-[440px]">
                  <MapPreview />
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[26px] border border-slate-200 bg-[#F4FBF9] p-6 dark:border-[#d7e5e3] dark:bg-white">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-900">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    What the dashboard gives you
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#d7e5e3]">
                      <p className="text-2xl font-semibold text-slate-900">Hotspots</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">See where repeated problems are building up across nearby areas.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#d7e5e3]">
                      <p className="text-2xl font-semibold text-slate-900">Review queue</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Spot reports that need attention, duplicate checks, or status updates.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#d7e5e3]">
                      <p className="text-2xl font-semibold text-slate-900">Visible progress</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Track what is still open, what is moving, and what has already been fixed.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Bot className="h-4 w-4 text-indigo-600" />
                    What Fixi AI helps with
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Clearer submissions</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Helps users understand categories and send cleaner issue reports.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                      <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Smarter triage</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Supports urgency hints, duplicate awareness, and issue classification.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Better community context</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Makes it easier for people to understand what is happening before they act.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      <section className="bg-[#F4FBF9] py-16 transition-colors dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 rounded-[30px] border border-[#D7ECE7] bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[0.25fr_1fr]">
            <div className="mx-auto flex h-36 w-full max-w-[170px] items-center justify-center rounded-[24px] border border-[#D7ECE7] bg-gradient-to-br from-slate-950 via-[#0c2440] to-[#0F766E] shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10 text-4xl font-semibold text-white shadow-lg backdrop-blur-sm">
                I
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-cyan-300">Project creator</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Created by Ishma</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                Fixify was built as a final-year project inspired by local civic issues and the need for a clearer, more community-focused way to report and track them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#073B3A] py-20">
        <div className="absolute inset-0 civic-grid opacity-25" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-300/15 px-4 py-2 text-sm text-teal-100">
            <Shield className="h-4 w-4" />
            Make your voice visible
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
            Ready to report something that should not stay ignored?
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Use Fixify to document the issue, place it on the map, and give your community a clearer starting point for action.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            {user ? (
              <Link to="/report">
                <Button size="lg" className="h-12 rounded-full bg-[#0F766E] px-8 font-semibold text-white hover:bg-[#115E59]" data-testid="cta-report-btn">
                  Report Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/signup">
                <Button size="lg" className="h-12 rounded-full bg-[#0F766E] px-8 font-semibold text-white hover:bg-[#115E59]" data-testid="cta-signup-btn">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link to="/community">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-slate-500 text-slate-200 hover:bg-slate-800" data-testid="cta-community-btn">
                Visit Community Hub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/images/Logo.png" alt="Fixify logo" className="h-10 w-10 rounded-xl object-cover" />
            <span className="text-xl font-semibold text-white">Fixify</span>
          </div>
          <p className="text-center text-sm text-slate-400">
            Copyright 2026 Fixify. Built for local communities and civic visibility.
          </p>
          <div className="flex gap-4">
            <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white">Dashboard</Link>
            <Link to="/community" className="text-sm text-slate-400 hover:text-white">Community</Link>
            <Link to="/report" className="text-sm text-slate-400 hover:text-white">Report</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
