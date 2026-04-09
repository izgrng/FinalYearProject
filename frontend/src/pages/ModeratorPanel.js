import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Shield, Users, Calendar, Plus, Check, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

const ModeratorPanel = () => {
  const { api } = useAuth();
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", event_date: "", location: "", max_participants: 20
  });

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, eventsRes, postsRes] = await Promise.all([
        api.get("/community/membership-requests"),
        api.get("/events"),
        api.get("/community/posts/pending")
      ]);
      setRequests(reqRes.data);
      setEvents(eventsRes.data);
      setPendingPosts(postsRes.data);
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
      setNewEvent({ title: "", description: "", event_date: "", location: "", max_participants: 20 });
      fetchData();
    } catch (error) {
      toast.error("Failed to create event");
    }
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
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Posts
              {pendingPosts.length > 0 && <Badge className="ml-1">{pendingPosts.length}</Badge>}
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
        </Tabs>
      </div>
    </div>
  );
};

export default ModeratorPanel;
