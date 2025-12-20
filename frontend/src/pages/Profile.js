import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { MapPin, Clock, ThumbsUp, FileText, User, Mail, Calendar } from "lucide-react";

const Profile = () => {
  const { user, api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      const response = await api.get("/reports/user/mine");
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  const categoryColors = {
    Waste: "#f97316", Road: "#6366f1", Water: "#0ea5e9",
    Safety: "#ef4444", Infrastructure: "#8b5cf6", Environment: "#22c55e", Other: "#64748b"
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-[Manrope]" data-testid="profile-name">{user?.full_name}</h1>
                <div className="flex items-center gap-4 mt-2 text-slate-600">
                  <span className="flex items-center gap-1 text-sm">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </span>
                  <Badge variant={user?.role === "moderator" ? "default" : "secondary"}>
                    {user?.role === "moderator" ? "Moderator" : "Member"}
                  </Badge>
                  {user?.is_community_member && (
                    <Badge className="bg-green-100 text-green-700">Community Member</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-indigo-600">{reports.length}</p>
              <p className="text-sm text-slate-600">Reports Filed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-green-600">
                {reports.filter(r => r.status === "Fixed").length}
              </p>
              <p className="text-sm text-slate-600">Resolved</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {reports.filter(r => r.status === "Open").length}
              </p>
              <p className="text-sm text-slate-600">Open</p>
            </CardContent>
          </Card>
        </div>

        {/* My Reports */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              My Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 bg-slate-50 rounded-xl" data-testid={`my-report-${report.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge style={{ background: categoryColors[report.category], color: "white" }}>
                          {report.category}
                        </Badge>
                        <Badge variant={report.status === "Open" ? "outline" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(report.created_at)}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {report.location_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {report.upvotes || 0} upvotes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">You haven't filed any reports yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
