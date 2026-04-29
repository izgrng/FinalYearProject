import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard, Shield, Bell, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";

const Navbar = () => {
  const { user, logout, api } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
        setUnreadCount(res.data.filter((item) => !item.read).length);
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

  const resolveNotificationLink = (notification) => {
    switch (notification.type) {
      case "report_comment":
      case "report_upvote":
        return `/reports/${notification.report_id}`;
      case "community_post":
      case "post_approved":
      case "post_rejected":
      case "community_post_comment":
        return "/community";
      case "membership_request":
        return user?.role === "moderator" ? "/moderator" : "/community";
      case "membership_approved":
      case "membership_rejected":
        return "/community";
      default:
        return notification.report_id ? `/reports/${notification.report_id}` : "/dashboard";
    }
  };

  const avatarMarkup = useMemo(() => {
    if (user?.avatar_base64) {
      return (
        <img
          src={`data:image/jpeg;base64,${user.avatar_base64}`}
          alt={user.full_name}
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
      );
    }

    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-medium text-white">
        {user?.full_name?.charAt(0).toUpperCase()}
      </div>
    );
  }, [user]);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl transition-colors">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between">
          <Link to="/" className="group flex items-center gap-3" data-testid="nav-logo">
            <img
              src="/images/Logo.png"
              alt="Fixify logo"
              className="h-12 w-12 rounded-2xl object-cover shadow-lg shadow-indigo-500/25 transition-shadow group-hover:shadow-indigo-500/40"
            />
            <span className="text-[1.9rem] font-semibold tracking-tight text-slate-900">Fixify</span>
          </Link>

          <div className="ml-10 hidden flex-1 items-center gap-1 md:flex">
            <Link to="/dashboard">
              <Button variant="ghost" className="rounded-full text-base text-slate-700 hover:bg-slate-100 hover:text-slate-900" data-testid="nav-dashboard">
                {t.navDashboard}
              </Button>
            </Link>
            <Link to="/#how-it-works">
              <Button variant="ghost" className="rounded-full text-base text-slate-700 hover:bg-slate-100 hover:text-slate-900" data-testid="nav-how-it-works">
                {t.navHowItWorks}
              </Button>
            </Link>
            <Link to="/community">
              <Button variant="ghost" className="rounded-full text-base text-slate-700 hover:bg-slate-100 hover:text-slate-900" data-testid="nav-community">
                {t.navCommunity}
              </Button>
            </Link>
            {user && (
              <Link to="/report">
                <Button className="ml-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-base text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700" data-testid="nav-report-btn">
                  {t.navReport}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 shadow-sm sm:flex">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  language === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Switch language to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("np")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  language === "np" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Switch language to Nepali"
              >
                NP
              </button>
            </div>

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
                    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
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
                      <span className="absolute -right-2 -top-2 h-4 min-w-[16px] rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">Tap an item to open it</p>
                </div>
                {notifications.length === 0 ? (
                  <>
                    <DropdownMenuItem className="text-sm text-slate-600">
                      No notifications yet.
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs text-slate-500">
                      Notifications will appear when someone interacts with your reports or community activity.
                    </DropdownMenuItem>
                  </>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="cursor-pointer whitespace-normal text-sm text-slate-700"
                      onClick={() => navigate(resolveNotificationLink(notification))}
                    >
                      {notification.message}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full hover:bg-slate-100" data-testid="nav-user-menu">
                    {avatarMarkup}
                    <span className="hidden font-medium text-slate-700 sm:block">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer" data-testid="nav-profile">
                    <User className="mr-2 h-4 w-4" />
                    {t.navProfile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t.navDashboard}
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
                  <Button variant="ghost" className="rounded-full text-base text-slate-700 hover:text-slate-900" data-testid="nav-login">
                    {t.navLogin}
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-base text-white shadow-sm shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700" data-testid="nav-signup">
                    {t.navSignup}
                  </Button>
                </Link>
              </div>
            )}

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

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">{t.navDashboard}</Button>
              </Link>
              <Link to="/community" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">{t.navCommunity}</Button>
              </Link>
              {user && (
                <Link to="/report" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">{t.navReport}</Button>
                </Link>
              )}
              <div className="mt-2 flex items-center gap-2 px-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.languageLabel}</span>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${language === "en" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("np")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${language === "np" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  NP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
