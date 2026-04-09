import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { MapPin, Clock, ThumbsUp, FileText, User, Mail, Calendar } from "lucide-react";

const Profile = () => {
  const { user, api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });

  const fetchMyReports = useCallback(async () => {
    try {
      const response = await api.get("/reports/user/mine");
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

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

  const startEdit = (report) => {
    setEditReport(report);
    setEditForm({ title: report.title, description: report.description });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editReport) return;
    try {
      const res = await api.put(`/reports/${editReport.id}`, {
        title: editForm.title,
        description: editForm.description
      });
      setReports((prev) => prev.map((r) => (r.id === editReport.id ? res.data : r)));
      setEditOpen(false);
    } catch (error) {
      console.error("Failed to update report", error);
    }
  };

  const deleteReport = async (reportId) => {
    const confirmed = window.confirm("Do you want to delete this report? This action cannot be undone.");
    if (!confirmed) return;
    try {
      await api.delete(`/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error) {
      console.error("Failed to delete report", error);
    }
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{formatDate(report.created_at)}</span>
                          <Button variant="outline" size="sm" onClick={() => startEdit(report)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteReport(report.id)}>
                            Delete
                          </Button>
                        </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
