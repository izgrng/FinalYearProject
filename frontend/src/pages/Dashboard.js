import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Eye,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryColors = {
  "Road & Transport": "#1f6feb",
  "Waste & Sanitation": "#f97316",
  "Water & Drainage": "#0ea5e9",
  "Electricity & Street Facilities": "#eab308",
  "Public Safety": "#ef4444",
  Environment: "#22c55e",
  "Public Facilities": "#8b5cf6",
  "Other / Unclassified": "#64748b",
};

const statusStyles = {
  "Needs Review": "bg-amber-50 text-amber-700 border-amber-200",
  Open: "bg-sky-50 text-sky-700 border-sky-200",
  "Under Review": "bg-violet-50 text-violet-700 border-violet-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Fixed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const urgencyStyles = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
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
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [location.search, userCoords]);

  useEffect(() => {
    if (!nearbyOnly || !userCoords) {
      setReports(allReports);
      return;
    }

    const toRad = (value) => (value * Math.PI) / 180;
    const haversine = (a, b) => {
      const radius = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
      return 2 * radius * Math.asin(Math.sqrt(h));
    };

    setReports(
      allReports.filter((report) => haversine(userCoords, { lat: report.latitude, lng: report.longitude }) <= 5)
    );
  }, [nearbyOnly, userCoords, allReports]);

  const handleLike = async (reportId) => {
    if (!user) return;
    try {
      const res = await api.post(`/reports/${reportId}/upvote`);
      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, upvotes: res.data.upvotes } : report)));
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

  const trendData =
    stats?.trend?.map((item) => ({
      ...item,
      shortDate: new Date(item.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    })) || [];

  const statusChartData = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: stats?.status_counts?.[status] || 0,
      })),
    [stats]
  );

  const lowConfidenceReports = useMemo(
    () =>
      [...reports]
        .filter((report) => typeof report.ai_confidence === "number" && report.ai_confidence < 0.6)
        .slice(0, 4),
    [reports]
  );

  const topCategory = useMemo(() => {
    const entries = Object.entries(stats?.categories || {});
    if (!entries.length) return null;
    const [name, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return { name, count };
  }, [stats]);

  const categoryBreakdown = useMemo(
    () =>
      Object.entries(stats?.categories || {})
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [stats]
  );

  const summaryCards = [
    {
      label: "Total Reports",
      value: reports.length,
      note: "Visible in current filter set",
      icon: <BarChart3 className="h-5 w-5 text-indigo-600" />,
      shell: "bg-indigo-50",
    },
    {
      label: "Needs Review",
      value: stats?.needs_review_reports || 0,
      note: "Awaiting a closer look",
      icon: <ClipboardList className="h-5 w-5 text-amber-600" />,
      shell: "bg-amber-50",
    },
    {
      label: "In Progress",
      value: (stats?.status_counts?.["Under Review"] || 0) + (stats?.status_counts?.["In Progress"] || 0),
      note: "Currently being handled",
      icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
      shell: "bg-indigo-50",
    },
    {
      label: "Resolved",
      value: stats?.status_counts?.Fixed || 0,
      note: "Marked fixed so far",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      shell: "bg-emerald-50",
    },
    {
      label: "Possible Duplicates",
      value: stats?.duplicates_count || 0,
      note: "May describe the same issue",
      icon: <Sparkles className="h-5 w-5 text-violet-600" />,
      shell: "bg-violet-50",
    },
    {
      label: topCategory?.name || "Top Category",
      value: topCategory?.count || 0,
      note: topCategory ? "Highest number of submitted reports" : "Category trend appears once data loads",
      icon: <ClipboardList className="h-5 w-5 text-cyan-600" />,
      shell: "bg-cyan-50",
    },
  ];

  const focusLanes = [
    {
      label: "Needs Review",
      value: stats?.needs_review_reports || 0,
      helper: "Flags, duplicates, and uncertain cases",
    },
    {
      label: "Active Issues",
      value:
        (stats?.status_counts?.Open || 0) +
        (stats?.status_counts?.["Under Review"] || 0) +
        (stats?.status_counts?.["In Progress"] || 0),
      helper: "Open, under review, or currently moving",
    },
    {
      label: "Resolved This Week",
      value: stats?.resolved_this_week || 0,
      helper: "Recent visible movement",
    },
  ];

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getReporterLabel = (report) =>
    report.user_name || report.reporter_name || report.full_name || report.location_name || "Community member";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 transition-colors dark:bg-[#eef5f4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[250px_1fr]">
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <Card className="border-slate-200 bg-slate-950 text-white shadow-sm dark:border-[#d7e5e3] dark:bg-[#0c2440]">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Fixify console</p>
                <h2 className="mt-3 text-2xl font-semibold">Report review</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  A tighter view for tracking what is waiting, moving, or already fixed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900">Response lanes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {focusLanes.map((lane) => (
                  <div key={lane.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{lane.label}</p>
                      <span className="text-2xl font-semibold text-slate-900">{lane.value}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{lane.helper}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900">Top category</CardTitle>
                <CardDescription>
                  The issue type appearing most often in the current dashboard data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topCategory ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{topCategory.name}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          This category currently has the highest number of submitted reports.
                        </p>
                      </div>
                      <Badge
                        className="border-0"
                        style={{
                          background: categoryColors[topCategory.name] || "#64748b",
                          color: "white",
                        }}
                      >
                        {topCategory.count}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Category trends will appear here once report data is available.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white" ref={mapRef}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  Live map
                </CardTitle>
                <CardDescription>
                  Smaller supporting map for checking where the selected report sits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[290px] overflow-hidden rounded-2xl border border-slate-200">
                  <ReportMap
                    reports={reports}
                    onMarkerClick={setSelectedReport}
                    selectedReport={selectedReport}
                  />
                </div>
                {selectedReport ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">{selectedReport.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedReport.location_name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Pick a report from the table or a map marker to focus it here.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900">Category breakdown</CardTitle>
                <CardDescription>
                  Compare how many issues are currently sitting in each report category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryBreakdown.length ? (
                  categoryBreakdown.map((category, index) => (
                    <div
                      key={category.name}
                      className={`rounded-2xl border p-3 ${
                        index === 0 ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: categoryColors[category.name] || "#64748b" }}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{category.name}</p>
                            <p className="text-xs text-slate-500">
                              {index === 0 ? "Current highest report count" : "Visible in dashboard data"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className="border-0"
                          style={{
                            background: categoryColors[category.name] || "#64748b",
                            color: "white",
                          }}
                        >
                          {category.count}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Category totals will appear here once report data is available.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900" data-testid="dashboard-title">
                  User Reports
                </h1>
                <p className="mt-1 max-w-2xl text-slate-600">
                  View and manage the submitted reports, then use the side panels for context rather than endless scrolling.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current focus</p>
                <p className="mt-1 text-sm text-slate-700">
                  {stats?.needs_review_reports || 0} need review, {stats?.duplicates_count || 0} may be duplicates,
                  and {stats?.resolved_this_week || 0} were resolved this week.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {summaryCards.map((card) => (
                <Card key={card.label} className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                  <CardContent className="flex items-start justify-between p-5">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                      <p className="mt-2 text-xs text-slate-500">{card.note}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.shell}`}>
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by location..."
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className="pl-10"
                      data-testid="filter-location"
                    />
                  </div>

                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger className="w-full lg:w-[180px]" data-testid="filter-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statusOrder.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                    <SelectTrigger className="w-full lg:w-[220px]" data-testid="filter-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.keys(categoryColors).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setFilters({ category: "", status: "", location: "" })}
                    data-testid="filter-clear"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>

                {nearbyOnly && !userCoords && (
                  <p className="mt-3 text-xs text-slate-500">Enable location access if you want to filter this list to nearby reports.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
              <CardContent className="p-0">
                {reports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr className="text-left text-slate-600">
                          <th className="px-5 py-4 font-medium">Report</th>
                          <th className="px-5 py-4 font-medium">Location</th>
                          <th className="px-5 py-4 font-medium">Category</th>
                          <th className="px-5 py-4 font-medium">Priority</th>
                          <th className="px-5 py-4 font-medium">Status</th>
                          <th className="px-5 py-4 font-medium">Reported On</th>
                          <th className="px-5 py-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report) => (
                          <Fragment key={report.id}>
                            <tr key={report.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                              <td className="px-5 py-4">
                                <Link to={`/reports/${report.id}`} className="font-medium text-slate-900 hover:underline">
                                  {report.title}
                                </Link>
                                <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">
                                  {report.description}
                                </p>
                                <p className="mt-2 text-xs text-slate-400">{getReporterLabel(report)}</p>
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                <div className="flex items-start gap-2">
                                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                                  <span className="max-w-[180px] leading-5">{report.location_name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <Badge style={{ background: categoryColors[report.category], color: "white" }} className="border-0">
                                  {report.category}
                                </Badge>
                              </td>
                              <td className="px-5 py-4">
                                <div className="space-y-2">
                                  {report.urgency && (
                                    <Badge className={`border ${urgencyStyles[report.urgency] || urgencyStyles.low}`}>
                                      {report.urgency} urgency
                                    </Badge>
                                  )}
                                  {typeof report.ai_confidence === "number" && (
                                    <p className="text-xs text-slate-500">
                                      {Math.round(report.ai_confidence * 100)}% AI confidence
                                    </p>
                                  )}
                                  {report.duplicate_of && (
                                    <p className="text-xs font-medium text-amber-700">Possible duplicate</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <Badge className={`border ${statusStyles[report.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                                  {report.status}
                                </Badge>
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                <p>{formatDate(report.created_at)}</p>
                                <p className="mt-1 text-xs text-slate-400">{formatTime(report.created_at)}</p>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <Link to={`/reports/${report.id}`}>
                                    <Button variant="outline" size="sm">
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      View
                                    </Button>
                                  </Link>
                                  <Button variant="outline" size="sm" onClick={() => focusMap(report)}>
                                    <MapPin className="mr-1 h-3.5 w-3.5" />
                                    Map
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => toggleComments(report.id)}>
                                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                                    Notes
                                  </Button>
                                </div>
                                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                                  <button type="button" onClick={() => handleLike(report.id)} className="inline-flex items-center gap-1 hover:text-slate-900">
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    {report.upvotes || 0}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {commentsOpen[report.id] && (
                              <tr className="border-b border-slate-100 bg-slate-50/60">
                                <td colSpan={7} className="px-5 py-4">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-900">Comments and quick notes</p>
                                    <div className="space-y-2">
                                      {(commentsByReport[report.id] || []).map((comment) => (
                                        <div key={comment.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
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
                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input
                                          value={commentDrafts[report.id] || ""}
                                          onChange={(e) =>
                                            setCommentDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                                          }
                                          placeholder="Write a comment..."
                                          className="sm:flex-1"
                                        />
                                        <Button onClick={() => submitComment(report.id)}>Post</Button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <p className="text-slate-500">No reports found</p>
                    <p className="mt-1 text-sm text-slate-400">Once reports come in, this table becomes the working queue.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Report Flow
                  </CardTitle>
                  <CardDescription>Where visible reports currently sit in the response cycle.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-medium text-slate-900">Weekly movement</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="submitted" fill="#0f172a" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="resolved" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-slate-900">AI Watchlist</CardTitle>
                    <CardDescription>Reports where human review matters more.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lowConfidenceReports.length > 0 ? (
                      lowConfidenceReports.map((report) => (
                        <Link
                          key={report.id}
                          to={`/reports/${report.id}`}
                          className="block rounded-2xl border border-slate-200 p-3 hover:border-indigo-200 hover:bg-slate-50"
                        >
                          <p className="font-medium text-slate-900">{report.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {Math.round((report.ai_confidence || 0) * 100)}% confidence
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="py-4 text-sm text-slate-500">No low-confidence cases in the current view.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm dark:border-[#d7e5e3] dark:bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-slate-900">Top Hotspots</CardTitle>
                    <CardDescription>Locations generating the most reports right now.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats?.hotspots?.length > 0 ? (
                      stats.hotspots.map((spot, index) => (
                        <div key={`${spot.location}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-sm font-semibold text-red-700">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{spot.location}</p>
                              <p className="text-xs text-slate-500">Repeated issue area</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{spot.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-sm text-slate-500">Hotspots appear once reports start clustering.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
