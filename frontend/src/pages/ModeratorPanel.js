import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Shield, Users, Calendar, Plus, Check, X, Loader2, FileText, Link2, ClipboardList, Sparkles, KeyRound, Search } from "lucide-react";
import { toast } from "sonner";

const reportStatuses = ["Needs Review", "Open", "Under Review", "In Progress", "Fixed"];
const statusStyles = {
  "Needs Review": "bg-amber-100 text-amber-800",
  Open: "bg-sky-100 text-sky-800",
  "Under Review": "bg-violet-100 text-violet-800",
  "In Progress": "bg-indigo-100 text-indigo-800",
  Fixed: "bg-emerald-100 text-emerald-800",
};
const urgencyStyles = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-orange-100 text-orange-800",
  low: "bg-slate-100 text-slate-700",
};

const ModeratorPanel = () => {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [reportStatusDrafts, setReportStatusDrafts] = useState({});
  const [reportNotes, setReportNotes] = useState({});
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", event_date: "", location: "", max_participants: 20, related_report_ids: []
  });

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, eventsRes, postsRes, reportsRes, usersRes] = await Promise.all([
        api.get("/community/membership-requests"),
        api.get("/events"),
        api.get("/community/posts/pending"),
        api.get("/reports?limit=100"),
        api.get("/moderation/users")
      ]);
      setRequests(reqRes.data);
      setEvents(eventsRes.data);
      setPendingPosts(postsRes.data);
      setReports(reportsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.post(`/community/membership-requests/${requestId}/approve`);
      toast.success("Membership approved!");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.post(`/community/membership-requests/${requestId}/reject`);
      toast.success("Request rejected");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.event_date || !newEvent.location) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await api.post("/events", newEvent);
      toast.success("Event created!");
      setEventDialogOpen(false);
      setNewEvent({ title: "", description: "", event_date: "", location: "", max_participants: 20, related_report_ids: [] });
      fetchData();
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const toggleRelatedReport = (reportId, checked) => {
    setNewEvent((prev) => ({
      ...prev,
      related_report_ids: checked
        ? [...prev.related_report_ids, reportId]
        : prev.related_report_ids.filter((id) => id !== reportId)
    }));
  };

  const handleApprovePost = async (postId) => {
    try {
      await api.post(`/community/posts/${postId}/approve`);
      toast.success("Post approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve post");
    }
  };

  const handleRejectPost = async (postId) => {
    try {
      await api.post(`/community/posts/${postId}/reject`);
      toast.success("Post rejected");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject post");
    }
  };

  const handleUpdateUserRole = async (targetUser, nextRole) => {
    setActionLoading(`role-${targetUser.id}`);
    try {
      const response = await api.post(`/moderation/users/${targetUser.id}/role`, { role: nextRole });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? response.data : item)));
      toast.success(`${targetUser.full_name} is now ${nextRole}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update access");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateReportStatus = async (report) => {
    const nextStatus = reportStatusDrafts[report.id] || report.status;
    const note = reportNotes[report.id] || "";
    setActionLoading(report.id);
    try {
      await api.post(`/reports/${report.id}/status`, { status: nextStatus, note });
      toast.success("Report status updated");
      setReportNotes((prev) => ({ ...prev, [report.id]: "" }));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update report");
    } finally {
      setActionLoading(null);
    }
  };

  const operationalReports = [...reports]
    .filter((report) => report.status !== "Fixed")
    .sort((a, b) => {
      const urgencyRank = { high: 3, medium: 2, low: 1 };
      return (
        (urgencyRank[b.urgency] || 1) - (urgencyRank[a.urgency] || 1) ||
        (a.ai_confidence ?? 1) - (b.ai_confidence ?? 1)
      );
    });

  const visibleUsers = users.filter((account) => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      account.full_name?.toLowerCase().includes(query) ||
      account.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-[Manrope]" data-testid="moderator-title">Moderator Panel</h1>
            <p className="text-slate-600">Manage community membership and events</p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="mb-6">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membership Requests
              {requests.length > 0 && <Badge className="ml-1">{requests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Report Queue
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Posts
              {pendingPosts.length > 0 && <Badge className="ml-1">{pendingPosts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Team Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-xl flex items-start justify-between" data-testid={`request-${req.id}`}>
                        <div>
                          <p className="font-medium text-slate-900">{req.user_name}</p>
                          <p className="text-sm text-slate-500">{req.user_email}</p>
                          <p className="text-sm text-slate-600 mt-2 italic">"{req.reason}"</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id} className="bg-green-600 hover:bg-green-700" data-testid={`approve-${req.id}`}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} disabled={actionLoading === req.id} className="text-red-600 border-red-200 hover:bg-red-50" data-testid={`reject-${req.id}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No pending requests</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Events</CardTitle>
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-event-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Title</Label>
                        <Input value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} placeholder="Community Clean-up Drive" data-testid="event-title-input" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} placeholder="Event details..." data-testid="event-description-input" />
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})} data-testid="event-date-input" />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} placeholder="Ratna Park, Kathmandu" data-testid="event-location-input" />
                      </div>
                      <div>
                        <Label>Max Participants</Label>
                        <Input type="number" value={newEvent.max_participants} onChange={(e) => setNewEvent({...newEvent, max_participants: parseInt(e.target.value)})} data-testid="event-max-input" />
                      </div>
                      <div>
                        <Label>Link Reports</Label>
                        <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                          {reports.length === 0 ? (
                            <p className="text-sm text-slate-500">No reports available to link.</p>
                          ) : (
                            reports.slice(0, 12).map((report) => (
                              <label key={report.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                                <Checkbox
                                  checked={newEvent.related_report_ids.includes(report.id)}
                                  onCheckedChange={(checked) => toggleRelatedReport(report.id, checked === true)}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900">{report.title}</p>
                                  <p className="text-xs text-slate-500">{report.category} · {report.location_name}</p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <Button onClick={handleCreateEvent} className="w-full bg-indigo-600 hover:bg-indigo-700" data-testid="submit-event-btn">Create Event</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">{event.title}</h3>
                            <p className="text-sm text-slate-600">{event.location}</p>
                            {event.related_report_ids?.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                                  <Link2 className="mr-1 h-3 w-3" />
                                  {event.related_report_ids.length} linked report{event.related_report_ids.length > 1 ? "s" : ""}
                                </Badge>
                                {event.related_report_ids.slice(0, 2).map((reportId) => {
                                  const report = reports.find((item) => item.id === reportId);
                                  return report ? (
                                    <span key={reportId} className="text-xs text-slate-500">{report.title}</span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          <Badge>{event.participants?.length || 0}/{event.max_participants}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No events created yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Operational Report Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {operationalReports.length === 0 ? (
                  <p className="text-slate-600">No active reports to manage.</p>
                ) : (
                  <div className="space-y-4">
                    {operationalReports.slice(0, 16).map((report) => (
                      <div key={report.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{report.title}</p>
                              <Badge className={statusStyles[report.status] || "bg-slate-100 text-slate-700"}>
                                {report.status}
                              </Badge>
                              {report.urgency && (
                                <Badge className={urgencyStyles[report.urgency] || urgencyStyles.low}>
                                  {report.urgency} urgency
                                </Badge>
                              )}
                              {report.duplicate_of && (
                                <Badge className="bg-amber-100 text-amber-800">Possible duplicate</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{report.category} • {report.location_name}</p>
                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">{report.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {typeof report.ai_confidence === "number" && (
                                <span className="rounded-full bg-slate-100 px-2 py-1">
                                  AI confidence {Math.round(report.ai_confidence * 100)}%
                                </span>
                              )}
                              {report.ai_source && (
                                <span className="rounded-full bg-slate-100 px-2 py-1">
                                  Source {report.ai_source}
                                </span>
                              )}
                              {report.urgency_reason && (
                                <span className="rounded-full bg-slate-100 px-2 py-1">
                                  {report.urgency_reason}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="w-full lg:w-[320px] space-y-3">
                            <div>
                              <Label>Update status</Label>
                              <Select
                                value={reportStatusDrafts[report.id] || report.status}
                                onValueChange={(value) =>
                                  setReportStatusDrafts((prev) => ({ ...prev, [report.id]: value }))
                                }
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {reportStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Moderator note</Label>
                              <Textarea
                                value={reportNotes[report.id] || ""}
                                onChange={(e) =>
                                  setReportNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                                }
                                placeholder="Add a note for the timeline..."
                                className="mt-2 min-h-[92px]"
                              />
                            </div>
                            <Button
                              onClick={() => handleUpdateReportStatus(report)}
                              disabled={actionLoading === report.id}
                              className="w-full"
                            >
                              {actionLoading === report.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Save Status Update
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Pending Community Posts</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPosts.length === 0 ? (
                  <p className="text-slate-600">No pending posts.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPosts.map((post) => (
                      <div key={post.id} className="p-4 border border-slate-200 rounded-xl">
                        <h4 className="font-semibold text-slate-900 mb-1">{post.title}</h4>
                        <p className="text-sm text-slate-600 mb-2">{post.content}</p>
                        <p className="text-xs text-slate-500 mb-3">Posted by {post.user_name}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprovePost(post.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectPost(post.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Moderator Access</CardTitle>
                <p className="text-sm text-slate-600">
                  Give trusted colleagues moderator permission on their own accounts instead of sharing one login.
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative mb-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search people by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-4">
                  {visibleUsers.map((account) => {
                    const isSelf = account.id === user?.id;
                    const isModerator = account.role === "moderator";
                    return (
                      <div key={account.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          {account.avatar_base64 ? (
                            <img
                              src={`data:image/jpeg;base64,${account.avatar_base64}`}
                              alt={account.full_name}
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                              {account.full_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{account.full_name}</p>
                            <p className="text-sm text-slate-500">{account.email}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant={isModerator ? "default" : "secondary"}>
                                {isModerator ? "Moderator" : "User"}
                              </Badge>
                              {account.is_community_member && (
                                <Badge className="bg-green-100 text-green-700">Community Member</Badge>
                              )}
                              {isSelf && (
                                <Badge className="bg-indigo-100 text-indigo-700">You</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isModerator ? (
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateUserRole(account, "user")}
                              disabled={isSelf || actionLoading === `role-${account.id}`}
                            >
                              {actionLoading === `role-${account.id}` ? "Updating..." : "Remove Moderator"}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleUpdateUserRole(account, "moderator")}
                              disabled={actionLoading === `role-${account.id}`}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {actionLoading === `role-${account.id}` ? "Updating..." : "Grant Moderator"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {visibleUsers.length === 0 && (
                    <p className="py-6 text-center text-slate-500">No matching users found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ModeratorPanel;
