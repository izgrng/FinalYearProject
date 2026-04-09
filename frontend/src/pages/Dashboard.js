import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReportMap } from "../components/MapComponent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  BarChart3, MapPin, AlertTriangle, CheckCircle2, 
  TrendingUp, Search, Filter, Clock, ThumbsUp, MessageSquare
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
  "Other / Unclassified": "#64748b"
};

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
    location: ""
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
        axios.get(`${API_URL}/dashboard/stats`)
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
        [reportId]: [...(prev[reportId] || []), res.data]
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

  const chartData = stats?.categories ? 
    Object.entries(stats.categories).map(([name, value]) => ({
      name,
      value,
      fill: categoryColors[name] || categoryColors.Other
    })) : [];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 font-[Manrope]" data-testid="dashboard-title">Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time community issue tracking</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats?.total_reports || 0}</p>
                  <p className="text-sm text-slate-500">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats?.open_reports || 0}</p>
                  <p className="text-sm text-slate-500">Open Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats?.fixed_reports || 0}</p>
                  <p className="text-sm text-slate-500">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats?.hotspots?.length || 0}</p>
                  <p className="text-sm text-slate-500">Hotspots</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8 relative z-20">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                <SelectTrigger className="w-[160px]" data-testid="filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(categoryColors).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-[140px]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
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
              <p className="mt-3 text-xs text-slate-500">
                Enable location access to see nearby reports.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm overflow-hidden" ref={mapRef}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Reports Map
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[500px] rounded-xl overflow-hidden">
                  <ReportMap 
                    reports={reports} 
                    onMarkerClick={setSelectedReport}
                    selectedReport={selectedReport}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-500 py-8">No data yet</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: item.fill }} />
                      <span className="text-xs text-slate-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hotspots */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Hotspots</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.hotspots?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.hotspots.map((spot, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{spot.location}</span>
                        </div>
                        <Badge variant="secondary">{spot.count} reports</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">No hotspots yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Latest Reports */}
        <Card className="border-0 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Latest Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.slice(0, 6).map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
                    data-testid={`report-card-${report.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge 
                        style={{ background: categoryColors[report.category], color: "white" }}
                        className="border-0"
                      >
                        {report.category}
                      </Badge>
                      <Badge variant={report.status === "Open" ? "outline" : "secondary"}>
                        {report.status}
                      </Badge>
                    </div>
                    <a
                      href={`/reports/${report.id}`}
                      className="font-semibold text-slate-900 mb-1 line-clamp-1 block hover:underline"
                    >
                      {report.title}
                    </a>
                    {report.image_base64 && (
                      <img
                        src={`data:image/jpeg;base64,${report.image_base64}`}
                        alt={report.title}
                        className="mb-3 h-32 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{report.description}</p>
                    <p className="text-xs text-slate-500 mb-2">
                      Posted by{" "}
                      {report.user_id ? (
                        <a
                          href={`/users/${report.user_id}`}
                          className="text-slate-700 underline hover:text-slate-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {report.user_name || "Anonymous"}
                        </a>
                      ) : (
                        report.user_name || "Anonymous"
                      )}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{report.location_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{report.upvotes || 0}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          focusMap(report);
                        }}
                      >
                        <MapPin className="w-3 h-3" />
                        View on Map
                      </button>
                      <button
                        type="button"
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(report.id);
                        }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Like
                      </button>
                      <button
                        type="button"
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComments(report.id);
                        }}
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
                                <a
                                  href={`/users/${comment.user_id}`}
                                  className="font-medium underline hover:text-slate-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {comment.user_name}
                                </a>
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
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                submitComment(report.id);
                              }}
                            >
                              Post
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">{formatDate(report.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No reports found</p>
                <p className="text-sm text-slate-400 mt-1">Be the first to report an issue!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
