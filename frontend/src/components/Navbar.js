import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "./ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard, Users, Shield, Bell, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const Navbar = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        // ignore
      }
    };
    loadNotifications();
  }, [user, api]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/70 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <img
              src="/images/Logo.png"
              alt="Fixify logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow"
            />
            <span className="text-xl font-bold font-[Manrope] text-slate-900">Fixify</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/dashboard">
              <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full text-base" data-testid="nav-dashboard">
                Dashboard
              </Button>
            </Link>
            <Link to="/#how-it-works">
              <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full text-base" data-testid="nav-how-it-works">
                How it works
              </Button>
            </Link>
            <Link to="/community">
              <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full text-base" data-testid="nav-community">
                Community Hub
              </Button>
            </Link>
            {user && (
              <Link to="/report">
                <Button className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-lg shadow-indigo-500/25 text-base" data-testid="nav-report-btn">
                  Report Issue
                </Button>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-slate-100"
              onClick={async () => {
                const shareUrl = window.location.origin;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Fixify", url: shareUrl });
                    return;
                  } catch (error) {
                    // fallback to copy
                  }
                }
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied to clipboard");
                } catch (error) {
                  toast.error("Failed to copy link");
                }
              }}
              data-testid="nav-share"
            >
              <Share2 className="h-5 w-5 text-slate-700" />
            </Button>
            <DropdownMenu
              onOpenChange={async (open) => {
                if (open && user && unreadCount > 0) {
                  try {
                    await api.post("/notifications/mark-read");
                    setUnreadCount(0);
                  } catch (error) {
                    // ignore
                  }
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" data-testid="nav-notifications">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-slate-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 h-4 min-w-[16px] rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">Latest activity</p>
                </div>
                {notifications.length === 0 ? (
                  <>
                    <DropdownMenuItem className="text-sm text-slate-600">
                      No notifications yet.
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs text-slate-500">
                      Notifications will appear when someone likes or comments.
                    </DropdownMenuItem>
                  </>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <DropdownMenuItem key={n.id} className="text-sm text-slate-700">
                      {n.message}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full hover:bg-slate-100" data-testid="nav-user-menu">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-slate-700 font-medium">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer" data-testid="nav-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === "moderator" && (
                    <DropdownMenuItem onClick={() => navigate("/moderator")} className="cursor-pointer" data-testid="nav-moderator">
                      <Shield className="mr-2 h-4 w-4" />
                      Moderator Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600" data-testid="nav-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-700 hover:text-slate-900 rounded-full text-base" data-testid="nav-login">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full text-base" data-testid="nav-signup">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="nav-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <div className="flex flex-col gap-2">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
              </Link>
              <Link to="/community" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Community Hub</Button>
              </Link>
              {user && (
                <Link to="/report" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Report Issue</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
