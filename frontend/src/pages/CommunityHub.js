import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Users, Calendar, MapPin, UserPlus, Clock, 
  CheckCircle2, AlertCircle, Loader2, Heart, FileText, Link2, MessageSquare, ImagePlus, Send
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CommunityHub = () => {
  const { user, api } = useAuth();
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postForm, setPostForm] = useState({ title: "", content: "" });
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentLoading, setCommentLoading] = useState(null);
  const [eventUpdateForms, setEventUpdateForms] = useState({});
  const [eventUpdateLoading, setEventUpdateLoading] = useState(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [membershipReason, setMembershipReason] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const [eventsRes, postsRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/events`),
        api.get("/community/posts"),
        api.get("/reports?limit=100")
      ]);
      setEvents(eventsRes.data || []);
      setPosts(postsRes.data || []);
      setReports(reportsRes.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const submitPost = async () => {
    if (!postForm.title || !postForm.content) {
      toast.error("Please fill all post fields");
      return;
    }
    setPosting(true);
    try {
      await api.post("/community/posts", postForm);
      toast.success("Post submitted for approval");
      setPostForm({ title: "", content: "" });
    } catch (error) {
      toast.error("Failed to submit post");
    } finally {
      setPosting(false);
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1]);
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const submitComment = async (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) {
      toast.error("Please write a comment first");
      return;
    }
    setCommentLoading(postId);
    try {
      const response = await api.post(`/community/posts/${postId}/comments`, { text });
      setPosts((prev) => prev.map((post) => (
        post.id === postId
          ? { ...post, comments: [...(post.comments || []), response.data] }
          : post
      )));
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      toast.success("Comment added");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add comment");
    } finally {
      setCommentLoading(null);
    }
  };

  const updateEventFormField = (eventId, field, value) => {
    setEventUpdateForms((prev) => ({
      ...prev,
      [eventId]: {
        text: "",
        outcome: "",
        image_base64: null,
        ...prev[eventId],
        [field]: value,
      },
    }));
  };

  const handleEventImageChange = async (eventId, file) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      updateEventFormField(eventId, "image_base64", base64);
      toast.success("Event update image attached");
    } catch (error) {
      toast.error("Failed to read event image");
    }
  };

  const submitEventUpdate = async (eventId) => {
    const form = eventUpdateForms[eventId] || {};
    if (!form.text?.trim()) {
      toast.error("Please write an update first");
      return;
    }
    setEventUpdateLoading(eventId);
    try {
      const response = await api.post(`/events/${eventId}/updates`, {
        text: form.text.trim(),
        outcome: form.outcome?.trim() || "",
        image_base64: form.image_base64 || null
      });
      setEvents((prev) => prev.map((event) => (
        event.id === eventId
          ? { ...event, updates: [...(event.updates || []), response.data] }
          : event
      )));
      setEventUpdateForms((prev) => ({
        ...prev,
        [eventId]: { text: "", outcome: "", image_base64: null }
      }));
      toast.success("Event update shared");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to share event update");
    } finally {
      setEventUpdateLoading(null);
    }
  };

  const handleMembershipRequest = async () => {
    if (!membershipReason.trim()) {
      toast.error("Please provide a reason for joining");
      return;
    }

    setRequestLoading(true);
    try {
      await api.post("/community/request-membership", { reason: membershipReason });
      toast.success("Membership request submitted! Waiting for moderator approval.");
      setMembershipStatus("pending");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleJoinEvent = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/join`);
      toast.success("Successfully joined the event!");
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to join event");
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/leave`);
      toast.success("Left the event");
      fetchEvents();
    } catch (error) {
      toast.error("Failed to leave event");
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 py-16">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1739381650437-49c73c5d4daf?crop=entropy&cs=srgb&fm=jpg&q=85')`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 font-[Manrope]" data-testid="community-title">
            Community Hub
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Join local volunteering activities, participate in community clean-ups, 
            and make a positive impact in your neighborhood.
          </p>

          {/* Membership Status */}
          {user && !user.is_community_member && (
            <div className="mt-8">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-white text-indigo-600 hover:bg-white/90 rounded-full px-8"
                    data-testid="request-membership-btn"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Request Membership
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Community Membership</DialogTitle>
                    <DialogDescription>
                      Tell us why you want to join the Community Hub. A moderator will review your request.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea
                      placeholder="I want to join because..."
                      value={membershipReason}
                      onChange={(e) => setMembershipReason(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="membership-reason-input"
                    />
                    <Button 
                      onClick={handleMembershipRequest}
                      disabled={requestLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      data-testid="submit-membership-btn"
                    >
                      {requestLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {user?.is_community_member && (
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-100">
              <CheckCircle2 className="w-5 h-5" />
              <span>You're a Community Member!</span>
            </div>
          )}

          {!user && (
            <p className="mt-8 text-white/70 text-sm">
              Please login to request membership and join events
            </p>
          )}
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-[Manrope]">Upcoming Events</h2>
            <p className="text-slate-600">Join local volunteering activities</p>
          </div>
          {user?.role === "moderator" && (
            <Badge className="bg-purple-100 text-purple-700">Moderator</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : events.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const isJoined = user && event.participants?.includes(user.id);
              const isFull = event.participants?.length >= event.max_participants;
              const canPostEventUpdate = user && (user.role === "moderator" || isJoined);

              return (
                <Card key={event.id} className="border-0 shadow-sm hover:shadow-md transition-shadow" data-testid={`event-card-${event.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      {isFull && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">Full</Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>{event.participants?.length || 0} / {event.max_participants} participants</span>
                      </div>
                      {event.related_report_ids?.length > 0 && (
                        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Link2 className="w-4 h-4 text-indigo-600" />
                            Linked Reports
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.related_report_ids.map((reportId) => {
                              const report = reports.find((item) => item.id === reportId);
                              return report ? (
                                <Badge key={reportId} variant="secondary" className="bg-indigo-50 text-indigo-700">
                                  {report.title}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {user?.is_community_member && (
                      <div className="pt-3 border-t border-slate-100">
                        {isJoined ? (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleLeaveEvent(event.id)}
                            data-testid={`leave-event-${event.id}`}
                          >
                            Leave Event
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            disabled={isFull}
                            onClick={() => handleJoinEvent(event.id)}
                            data-testid={`join-event-${event.id}`}
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            {isFull ? "Event Full" : "Join Event"}
                          </Button>
                        )}
                      </div>
                    )}

                    {user && !user.is_community_member && (
                      <p className="text-xs text-slate-500 text-center pt-3 border-t border-slate-100">
                        Become a community member to join events
                      </p>
                    )}

                    {(event.updates?.length > 0 || canPostEventUpdate) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          Event Updates
                        </div>
                        {event.updates?.length > 0 ? (
                          <div className="space-y-3">
                            {event.updates.map((update) => (
                              <div key={update.id} className="rounded-xl bg-slate-50 p-3">
                                <p className="text-sm text-slate-800">{update.text}</p>
                                {update.outcome && (
                                  <p className="mt-2 text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">Outcome:</span> {update.outcome}
                                  </p>
                                )}
                                {update.image_url && (
                                  <img
                                    src={update.image_url}
                                    alt="Event update"
                                    className="mt-3 h-32 w-full rounded-xl object-cover"
                                  />
                                )}
                                <p className="mt-2 text-[11px] text-slate-500">
                                  Shared by {update.user_name}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No updates shared yet.</p>
                        )}

                        {canPostEventUpdate && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                            <Textarea
                              placeholder="Share what happened during or after this event..."
                              value={eventUpdateForms[event.id]?.text || ""}
                              onChange={(e) => updateEventFormField(event.id, "text", e.target.value)}
                              className="min-h-[90px]"
                            />
                            <Input
                              placeholder="Outcome, result, or impact summary"
                              value={eventUpdateForms[event.id]?.outcome || ""}
                              onChange={(e) => updateEventFormField(event.id, "outcome", e.target.value)}
                            />
                            <div className="flex items-center gap-3">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                                <ImagePlus className="w-4 h-4" />
                                Add Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleEventImageChange(event.id, e.target.files?.[0])}
                                />
                              </label>
                              {eventUpdateForms[event.id]?.image_base64 && (
                                <span className="text-xs text-green-600">Photo attached</span>
                              )}
                            </div>
                            <Button
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => submitEventUpdate(event.id)}
                              disabled={eventUpdateLoading === event.id}
                            >
                              {eventUpdateLoading === event.id ? "Posting Update..." : "Share Update"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Events Yet</h3>
              <p className="text-slate-600">Check back soon for upcoming community activities!</p>
            </CardContent>
          </Card>
        )}

        {/* Community Posts */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900">Community Posts</h3>
          </div>

          {user?.is_community_member && (
            <Card className="border-0 shadow-sm mb-6">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Post title"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Share your update..."
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="min-h-[120px]"
                />
                <Button onClick={submitPost} disabled={posting}>
                  {posting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </CardContent>
            </Card>
          )}

          {posts.length === 0 ? (
            <p className="text-slate-600">No community posts yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Card key={post.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">{post.title}</h4>
                    <p className="text-sm text-slate-600 mb-2">{post.content}</p>
                    <p className="text-xs text-slate-500">Posted by {post.user_name}</p>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Discussion
                      </div>
                      {post.comments?.length > 0 ? (
                        <div className="space-y-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2">
                              <p className="text-sm text-slate-700">{comment.text}</p>
                              <p className="mt-1 text-[11px] text-slate-500">By {comment.user_name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No comments yet.</p>
                      )}

                      {user?.is_community_member && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Add a comment..."
                            value={commentDrafts[post.id] || ""}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            className="min-h-[80px]"
                          />
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => submitComment(post.id)}
                            disabled={commentLoading === post.id}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {commentLoading === post.id ? "Posting..." : "Comment"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm bg-indigo-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Join the Community</h3>
              <p className="text-sm text-slate-600">Request membership to participate in events and activities.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-purple-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Volunteer Events</h3>
              <p className="text-sm text-slate-600">Participate in clean-ups, awareness drives, and more.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-cyan-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Make an Impact</h3>
              <p className="text-sm text-slate-600">Help improve your neighborhood and inspire others.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;
