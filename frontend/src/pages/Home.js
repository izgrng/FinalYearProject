import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { MapPreview } from "../components/MapComponent";
import { 
  MapPin, Camera, AlertTriangle, CheckCircle2, Users, Bot, 
  ArrowRight, Shield, Zap, BarChart3, Globe
} from "lucide-react";

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Snap & Report",
      description: "Upload a photo of the issue and our AI validates it automatically."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "AI Triage",
      description: "Smart categorization into Waste, Road, Water, Safety and more."
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Location Mapping",
      description: "Mark exact location on interactive maps for precise reporting."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Live Dashboard",
      description: "Track all reports with filters, charts, and hotspot analysis."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community Hub",
      description: "Join local volunteering activities and community clean-ups."
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: "Fixi AI Assistant",
      description: "Get guidance from our friendly chatbot on civic awareness."
    }
  ];

  const stats = [
    { value: "500+", label: "Reports Filed" },
    { value: "12", label: "Categories" },
    { value: "50+", label: "Communities" },
    { value: "95%", label: "AI Accuracy" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-95" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('/images/ktm.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/90 text-sm mb-6">
                <Globe className="w-4 h-4" />
                Empowering Nepal's Communities
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-[Manrope] tracking-tight">
                <span className="block">See it.</span>
                <span className="block">Say it.</span>
                <span className="block text-cyan-300">Report it.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl">
                Fixify empowers you to report local community problems — damaged roads, waste issues, 
                water problems, and safety concerns. Your voice matters.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Link to="/report">
                    <Button size="lg" className="bg-white text-[#0B1F3B] hover:bg-white/90 rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-black/20" data-testid="hero-report-btn">
                      Report an Issue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup">
                    <Button size="lg" className="bg-white text-[#0B1F3B] hover:bg-white/90 rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-black/20" data-testid="hero-get-started-btn">
                      Get Started
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-12 text-base" data-testid="hero-dashboard-btn">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#0B1F3B]/25 to-[#C9A227]/30 blur-3xl" />
                <img 
                  src="/images/ktm.jpg"
                  alt="Nepal Street Scene"
                  className="relative rounded-3xl shadow-2xl shadow-black/30 w-full"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">AI Verified</p>
                      <p className="text-xs text-slate-500">Report submitted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path 
              fill="hsl(var(--background))" 
              d="M0,96L80,85.3C160,75,320,53,480,53.3C640,53,800,75,960,80C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-4xl md:text-5xl font-bold gradient-text mb-2">{stat.value}</p>
                <p className="text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-[Manrope]">
              How Fixify Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our AI-powered platform makes reporting community issues simple, fast, and effective.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-[#C9A227]/40 hover:shadow-lg hover:shadow-[#0B1F3B]/10 transition-all group card-hover"
              >
                <div className="w-14 h-14 bg-[#0B1F3B]/10 rounded-xl flex items-center justify-center text-[#0B1F3B] mb-6 group-hover:bg-[#0B1F3B] group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Highlights */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-[Manrope]">
              Community In Focus
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A quick glimpse of local challenges and the people who care about solving them.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <img
                src="/images/img1.jpg"
                alt="Community issue"
                className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900">Local Issues</h3>
                <p className="text-sm text-slate-600">
                  Real problems captured and reported by citizens.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <img
                src="/images/UID.png"
                alt="User identity"
                className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900">Trusted Voices</h3>
                <p className="text-sm text-slate-600">
                  Verified participation builds stronger communities.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <img
                src="/images/WIP.jpeg"
                alt="Community progress"
                className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900">Work In Progress</h3>
                <p className="text-sm text-slate-600">
                  Track progress and celebrate improvements together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Preview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-[Manrope]">
              Explore Community Reports
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              See where issues are being reported across the city.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="h-[420px]">
              <MapPreview />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A227]/20 rounded-full text-[#C9A227] text-sm mb-6">
            <Shield className="w-4 h-4" />
            Make Your Voice Heard
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-[Manrope]">
            Ready to make a difference in your community?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Join thousands of citizens who are actively improving their neighborhoods through Fixify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/report">
                <Button size="lg" className="bg-[#0B1F3B] hover:bg-[#0B1F3B]/90 text-white rounded-full px-8 h-12" data-testid="cta-report-btn">
                  Report Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/signup">
                <Button size="lg" className="bg-[#0B1F3B] hover:bg-[#0B1F3B]/90 text-white rounded-full px-8 h-12" data-testid="cta-signup-btn">
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
            <Link to="/community">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-full px-8 h-12" data-testid="cta-community-btn">
                Join Community Hub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img
                src="/images/Logo.png"
                alt="Fixify logo"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="text-xl font-bold text-white font-[Manrope]">Fixify</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2026 Fixify. Empowering communities in Nepal.
            </p>
            <div className="flex gap-4">
              <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm">Dashboard</Link>
              <Link to="/community" className="text-slate-400 hover:text-white text-sm">Community</Link>
              <Link to="/report" className="text-slate-400 hover:text-white text-sm">Report</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
