import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { LocationPicker } from "../components/MapComponent";
import { 
  Users, Calendar, MapPin, UserPlus,
  CheckCircle2, Loader2, Heart, FileText, Link2, MessageSquare, ImagePlus, Send, Pencil
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const emptyPostForm = { title: "", content: "", location_name: "", latitude: null, longitude: null };

const CommunityHub = () => {
  const { user, api } = useAuth();
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [editPostForm, setEditPostForm] = useState(emptyPostForm);
  const [editingPost, setEditingPost] = useState(null);
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentLoading, setCommentLoading] = useState(null);
  const [eventUpdateForms, setEventUpdateForms] = useState({});
  const [eventUpdateLoading, setEventUpdateLoading] = useState(null);
  const [posting, setPosting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
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
    if (!postForm.title || !postForm.content || !postForm.location_name || postForm.latitude == null || postForm.longitude == null) {
      toast.error("Please add a title, details, and meeting point");
      return;
    }
    setPosting(true);
    try {
      await api.post("/community/posts", postForm);
      toast.success("Post submitted for approval");
      setPostForm(emptyPostForm);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit post");
    } finally {
      setPosting(false);
    }
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setEditPostForm({
      title: post.title || "",
      content: post.content || "",
      location_name: post.location_name || "",
      latitude: post.latitude ?? null,
      longitude: post.longitude ?? null,
    });
    setEditPostOpen(true);
  };

  const submitPostEdit = async () => {
    if (!editingPost) return;
    if (!editPostForm.title || !editPostForm.content || !editPostForm.location_name || editPostForm.latitude == null || editPostForm.longitude == null) {
      toast.error("Please keep the post title, details, and meeting point filled in");
      return;
    }
    setSavingEdit(true);
    try {
      const response = await api.put(`/community/posts/${editingPost.id}`, editPostForm);
      setPosts((prev) => prev.map((post) => (post.id === editingPost.id ? response.data : post)));
      setEditPostOpen(false);
      setEditingPost(null);
      toast.success("Post updated");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update post");
    } finally {
      setSavingEdit(false);
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

  const formatPostDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500 via-indigo-600 to-violet-700 py-16">
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
            <h2 className="text-2xl font-bold text-slate-900 font-[Manrope] dark:text-white">Upcoming Events</h2>
            <p className="text-slate-600 dark:text-slate-300">Join local volunteering activities</p>
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
                <Card key={event.id} className="border border-cyan-100 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900" data-testid={`event-card-${event.id}`}>
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
                          <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
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
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 dark:border-slate-800 dark:bg-slate-950">
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
            <Card className="border border-cyan-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-white">No Events Yet</h3>
              <p className="text-slate-600 dark:text-slate-300">Check back soon for upcoming community activities!</p>
            </CardContent>
          </Card>
        )}

        {/* Community Posts */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Community Posts</h3>
          </div>

          {user?.is_community_member && (
            <Card className="mb-6 border border-cyan-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="p-5">
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-3">
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
                    <Input
                      placeholder="Meeting point name"
                      value={postForm.location_name}
                      onChange={(e) => setPostForm({ ...postForm, location_name: e.target.value })}
                    />
                    {postForm.latitude != null && postForm.longitude != null && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Marker set at {postForm.latitude.toFixed(5)}, {postForm.longitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pick gathering location</p>
                    <LocationPicker
                      compact
                      selectedLocation={
                        postForm.latitude != null && postForm.longitude != null
                          ? { lat: postForm.latitude, lng: postForm.longitude }
                          : null
                      }
                      onLocationSelect={(location) =>
                        setPostForm((prev) => ({
                          ...prev,
                          latitude: location.lat,
                          longitude: location.lng,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={submitPost} disabled={posting}>
                  {posting ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {posts.length === 0 ? (
            <p className="text-slate-600">No community posts yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="border border-cyan-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <CardContent className="p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                          {post.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link to={`/users/${post.user_id}`} className="font-semibold text-slate-900 hover:underline dark:text-white">
                            {post.user_name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatPostDate(post.created_at)}</span>
                            {post.status && (
                              <Badge variant="outline" className="text-[11px]">
                                {post.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {(user?.id === post.user_id || user?.role === "moderator") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => openEditPost(post)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{post.title}</h4>
                    <p className="mb-3 mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{post.content}</p>
                    {post.location_name && (
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        <MapPin className="h-3.5 w-3.5" />
                        {post.location_name}
                      </div>
                    )}

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Discussion
                      </div>
                      {post.comments?.length > 0 ? (
                        <div className="space-y-2">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                              <p className="text-sm text-slate-700 dark:text-slate-200">{comment.text}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">By {comment.user_name}</p>
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

        <Dialog open={editPostOpen} onOpenChange={setEditPostOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Community Post</DialogTitle>
              <DialogDescription>
                Update the post details and meeting point so people know exactly where to gather.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 pt-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <Input
                  placeholder="Post title"
                  value={editPostForm.title}
                  onChange={(e) => setEditPostForm({ ...editPostForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Share your update..."
                  value={editPostForm.content}
                  onChange={(e) => setEditPostForm({ ...editPostForm, content: e.target.value })}
                  className="min-h-[120px]"
                />
                <Input
                  placeholder="Meeting point name"
                  value={editPostForm.location_name}
                  onChange={(e) => setEditPostForm({ ...editPostForm, location_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Update gathering location</p>
                <LocationPicker
                  compact
                  selectedLocation={
                    editPostForm.latitude != null && editPostForm.longitude != null
                      ? { lat: editPostForm.latitude, lng: editPostForm.longitude }
                      : null
                  }
                  onLocationSelect={(location) =>
                    setEditPostForm((prev) => ({
                      ...prev,
                      latitude: location.lat,
                      longitude: location.lng,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditPostOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitPostEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="border border-indigo-100 shadow-sm bg-indigo-50 dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 dark:text-white">Join the Community</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Request membership to participate in events and activities.</p>
            </CardContent>
          </Card>

          <Card className="border border-purple-100 shadow-sm bg-purple-50 dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 dark:text-white">Volunteer Events</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Participate in clean-ups, awareness drives, and more.</p>
            </CardContent>
          </Card>

          <Card className="border border-cyan-100 shadow-sm bg-cyan-50 dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 dark:text-white">Make an Impact</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Help improve your neighborhood and inspire others.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;
