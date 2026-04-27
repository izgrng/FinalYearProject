import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReportMap } from "../components/MapComponent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryColors = {
  "Road & Transport": "#1f6feb",
  "Waste & Sanitation": "#f97316",
  "Water & Drainage": "#0ea5e9",
  "Electricity & Street Facilities": "#eab308",
  "Public Safety": "#ef4444",
  "Environment": "#22c55e",
  "Public Facilities": "#8b5cf6",
  "Other / Unclassified": "#64748b",
};

const statusStyles = {
  "Needs Review": "bg-amber-100 text-amber-800 border-amber-200",
  Open: "bg-sky-100 text-sky-800 border-sky-200",
  "Under Review": "bg-violet-100 text-violet-800 border-violet-200",
  "In Progress": "bg-indigo-100 text-indigo-800 border-indigo-200",
  Fixed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const urgencyStyles = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-orange-100 text-orange-800 border-orange-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusOrder = ["Needs Review", "Open", "Under Review", "In Progress", "Fixed"];

const Dashboard = () => {
  const { user, api } = useAuth();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    location: "",
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentsByReport, setCommentsByReport] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all") params.append("category", filters.category);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.location) params.append("location", filters.location);

      const [reportsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/reports?${params.toString()}`),
        axios.get(`${API_URL}/dashboard/stats`),
      ]);

      setAllReports(reportsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isNearby = params.get("nearby") === "1";
    setNearbyOnly(isNearby);
    if (isNearby && !userCoords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserCoords(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [location.search, userCoords]);

  useEffect(() => {
    if (!nearbyOnly || !userCoords) {
      setReports(allReports);
      return;
    }
    const withinKm = 5;
    const toRad = (v) => (v * Math.PI) / 180;
    const haversine = (a, b) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    const filtered = allReports.filter((r) =>
      haversine(userCoords, { lat: r.latitude, lng: r.longitude }) <= withinKm
    );
    setReports(filtered);
  }, [nearbyOnly, userCoords, allReports]);

  const handleLike = async (reportId) => {
    if (!user) return;
    try {
      const res = await api.post(`/reports/${reportId}/upvote`);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvotes: res.data.upvotes } : r))
      );
    } catch (error) {
      console.error("Failed to like report", error);
    }
  };

  const toggleComments = async (reportId) => {
    const isOpen = commentsOpen[reportId];
    setCommentsOpen((prev) => ({ ...prev, [reportId]: !isOpen }));
    if (!isOpen && !commentsByReport[reportId]) {
      try {
        const res = await api.get(`/reports/${reportId}/comments`);
        setCommentsByReport((prev) => ({ ...prev, [reportId]: res.data }));
      } catch (error) {
        console.error("Failed to load comments", error);
      }
    }
  };

  const submitComment = async (reportId) => {
    if (!user) return;
    const text = (commentDrafts[reportId] || "").trim();
    if (!text) return;
    try {
      const res = await api.post(`/reports/${reportId}/comments`, { text });
      setCommentsByReport((prev) => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), res.data],
      }));
      setCommentDrafts((prev) => ({ ...prev, [reportId]: "" }));
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const focusMap = (report) => {
    setSelectedReport(report);
    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const chartData = stats?.categories
    ? Object.entries(stats.categories).map(([name, value]) => ({
        name,
        value,
        fill: categoryColors[name] || categoryColors["Other / Unclassified"],
      }))
    : [];

  const statusChartData = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: stats?.status_counts?.[status] || 0,
      })),
    [stats]
  );

  const trendData = stats?.trend?.map((item) => ({
    ...item,
    shortDate: new Date(item.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
  })) || [];

  const attentionReports = useMemo(() => {
    if (stats?.review_queue?.length) return stats.review_queue;
    return [...reports]
      .filter((report) => report.status !== "Fixed")
      .sort((a, b) => {
        const urgencyRank = { high: 3, medium: 2, low: 1 };
        return (
          (urgencyRank[b.urgency] || 1) - (urgencyRank[a.urgency] || 1) ||
          (a.ai_confidence ?? 1) - (b.ai_confidence ?? 1)
        );
      })
      .slice(0, 6);
  }, [reports, stats]);

  const lowConfidenceReports = useMemo(
    () =>
      [...reports]
        .filter((report) => typeof report.ai_confidence === "number" && report.ai_confidence < 0.6)
        .slice(0, 4),
    [reports]
  );

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="dashboard-title">
              Civic Response Dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-slate-600">
              Track what needs attention, where issue clusters are forming, and how community reports are moving toward resolution.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current focus</p>
            <p className="mt-1 text-sm text-slate-700">
              {stats?.needs_review_reports || 0} reports need review, {stats?.duplicates_count || 0} possible duplicates,
              and {stats?.resolved_this_week || 0} resolved this week.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Needs Review</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.needs_review_reports || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Possible duplicates and uncertain cases</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <ClipboardList className="h-6 w-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Issues</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.open_reports || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Open, under review, or in progress</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                  <AlertTriangle className="h-6 w-6 text-sky-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Possible Duplicates</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.duplicates_count || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Reports that likely describe the same issue</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                  <Sparkles className="h-6 w-6 text-violet-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Resolved This Week</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.resolved_this_week || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Visible movement, not just backlog</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm mb-8 relative z-20">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                <SelectTrigger className="w-[180px]" data-testid="filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(categoryColors).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-[180px]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOrder.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by location..."
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="pl-10"
                  data-testid="filter-location"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setFilters({ category: "", status: "", location: "" })}
                data-testid="filter-clear"
              >
                Clear
              </Button>
            </div>
            {nearbyOnly && !userCoords && (
              <p className="mt-3 text-xs text-slate-500">Enable location access to see nearby reports.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-8">
            <Card className="border-0 shadow-sm overflow-hidden" ref={mapRef}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Live Report Map
                </CardTitle>
                <CardDescription>
                  Explore where reports are clustering and jump straight into issue details.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[420px] rounded-xl overflow-hidden">
                  <ReportMap
                    reports={reports}
                    onMarkerClick={setSelectedReport}
                    selectedReport={selectedReport}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Report Flow
                  </CardTitle>
                  <CardDescription>Where current issues sit in the response pipeline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Weekly Movement
                  </CardTitle>
                  <CardDescription>Submitted vs resolved reports over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="submitted" fill="#0f172a" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="resolved" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Attention Needed</CardTitle>
                <CardDescription>Reports that deserve a first look from moderators or reviewers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attentionReports.length > 0 ? (
                  attentionReports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        const fullReport = reports.find((item) => item.id === report.id) || report;
                        focusMap(fullReport);
                      }}
                      className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`border ${urgencyStyles[report.urgency || "low"]}`}>
                          {report.urgency || "low"} urgency
                        </Badge>
                        <Badge className={`border ${statusStyles[report.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {report.status}
                        </Badge>
                        {report.duplicate_of && (
                          <Badge className="border border-amber-200 bg-amber-100 text-amber-800">
                            Possible duplicate
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 font-medium text-slate-900">{report.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{report.category} • {report.location_name}</p>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-sm text-slate-500">No reports currently need special attention.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">AI Watchlist</CardTitle>
                <CardDescription>Cases where the model was less confident and human review matters more.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowConfidenceReports.length > 0 ? (
                  lowConfidenceReports.map((report) => (
                    <Link
                      key={report.id}
                      to={`/reports/${report.id}`}
                      className="block rounded-xl border border-slate-200 p-3 hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {Math.round((report.ai_confidence || 0) * 100)}% confidence • {report.ai_source || "AI"}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="py-4 text-sm text-slate-500">AI is confident on the current set of visible reports.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Hotspots</CardTitle>
                <CardDescription>Locations generating the most issue reports right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.hotspots?.length > 0 ? (
                  stats.hotspots.map((spot, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-sm font-semibold text-red-700">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{spot.location}</p>
                          <p className="text-xs text-slate-500">Repeated issue area</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{spot.count} reports</Badge>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-sm text-slate-500">Hotspots will appear once a few reports accumulate.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Issue Mix</CardTitle>
                <CardDescription>Category distribution of the visible reports.</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={78}
                          paddingAngle={2}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                          <span className="text-xs text-slate-600">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-sm text-slate-500">No category data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-0 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Operational Queue
            </CardTitle>
            <CardDescription>
              These are the most relevant reports to inspect, validate, and move forward.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {reports.slice(0, 6).map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                    data-testid={`report-card-${report.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge style={{ background: categoryColors[report.category], color: "white" }} className="border-0">
                        {report.category}
                      </Badge>
                      <Badge className={`border ${statusStyles[report.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {report.status}
                      </Badge>
                      {report.urgency && (
                        <Badge className={`border ${urgencyStyles[report.urgency] || urgencyStyles.low}`}>
                          {report.urgency} urgency
                        </Badge>
                      )}
                    </div>

                    <Link to={`/reports/${report.id}`} className="block font-semibold text-slate-900 hover:underline">
                      {report.title}
                    </Link>

                    {report.image_base64 && (
                      <img
                        src={`data:image/jpeg;base64,${report.image_base64}`}
                        alt={report.title}
                        className="my-3 h-32 w-full rounded-lg object-cover"
                      />
                    )}

                    <p className="mb-3 text-sm text-slate-600 line-clamp-2">{report.description}</p>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {report.ai_source && (
                        <Badge variant="outline" className="text-[11px]">AI: {report.ai_source}</Badge>
                      )}
                      {typeof report.ai_confidence === "number" && (
                        <Badge variant="outline" className="text-[11px]">
                          {Math.round(report.ai_confidence * 100)}% confidence
                        </Badge>
                      )}
                      {report.duplicate_of && (
                        <Badge className="bg-amber-100 text-amber-800 text-[11px]">Possible duplicate</Badge>
                      )}
                    </div>

                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{report.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>

                    {report.urgency_reason && (
                      <p className="mb-3 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Urgency note:</span> {report.urgency_reason}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-slate-900"
                        onClick={() => focusMap(report)}
                      >
                        <MapPin className="w-3 h-3" />
                        View on map
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-slate-900"
                        onClick={() => handleLike(report.id)}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {report.upvotes || 0}
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-slate-900"
                        onClick={() => toggleComments(report.id)}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Comments
                      </button>
                    </div>

                    {commentsOpen[report.id] && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <div className="space-y-2">
                          {(commentsByReport[report.id] || []).map((comment) => (
                            <div key={comment.id} className="text-xs text-slate-700">
                              {comment.user_id ? (
                                <Link to={`/users/${comment.user_id}`} className="font-medium underline hover:text-slate-900">
                                  {comment.user_name}
                                </Link>
                              ) : (
                                <span className="font-medium">{comment.user_name}</span>
                              )}
                              {": "}
                              {comment.text}
                            </div>
                          ))}
                          {(commentsByReport[report.id] || []).length === 0 && (
                            <p className="text-xs text-slate-500">No comments yet.</p>
                          )}
                        </div>
                        {user && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={commentDrafts[report.id] || ""}
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                              }
                              placeholder="Write a comment..."
                              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                            <Button size="sm" onClick={() => submitComment(report.id)}>
                              Post
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No reports found</p>
                <p className="text-sm text-slate-400 mt-1">Once reports come in, this queue will become your action board.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
