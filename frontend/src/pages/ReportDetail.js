import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { MapPin, ThumbsUp, MessageSquare, ArrowLeft, Clock3, Sparkles } from "lucide-react";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

const ReportDetail = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [reportRes, commentsRes] = await Promise.all([
          axios.get(`${API_URL}/reports/${id}`),
          axios.get(`${API_URL}/reports/${id}/comments`)
        ]);
        setReport(reportRes.data);
        setComments(commentsRes.data);
      } catch (error) {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!report) {
    return <div className="min-h-screen flex items-center justify-center">Report not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card className="border-0 shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{report.title}</span>
              <Badge className="bg-slate-800 text-white">{report.category}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700">{report.description}</p>
            <div className="flex flex-wrap gap-2">
              {report.ai_source && <Badge variant="outline">AI: {report.ai_source}</Badge>}
              {typeof report.ai_confidence === "number" && (
                <Badge variant="outline">{Math.round(report.ai_confidence * 100)}% confidence</Badge>
              )}
              {report.urgency && (
                <Badge className={urgencyStyles[report.urgency] || urgencyStyles.low}>
                  {report.urgency} urgency
                </Badge>
              )}
              <Badge className={statusStyles[report.status] || "bg-slate-100 text-slate-700"}>
                {report.status}
              </Badge>
              {report.duplicate_of && (
                <Badge className="bg-amber-100 text-amber-800">Possible duplicate</Badge>
              )}
            </div>
            {report.urgency_reason && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Urgency Reason:</span> {report.urgency_reason}
              </p>
            )}
            {report.ai_reason && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">AI Reason:</span> {report.ai_reason}
              </p>
            )}
            {report.ai_analysis && (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Image Analysis:</span> {report.ai_analysis}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Posted by{" "}
              {report.user_id ? (
                <Link
                  to={`/users/${report.user_id}`}
                  className="underline hover:text-slate-900"
                >
                  {report.user_name || "Anonymous"}
                </Link>
              ) : (
                report.user_name || "Anonymous"
              )}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {report.location_name}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {report.upvotes || 0} likes
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {comments.length} comments
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-indigo-600" />
              Report Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.timeline?.length ? (
              <div className="space-y-4">
                {report.timeline.map((event, index) => (
                  <div key={event.id || index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      {index < report.timeline.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {event.actor_name} • {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">No timeline updates yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm mt-6">
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="text-slate-600">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm text-slate-700">
                    {comment.user_id ? (
                      <Link
                        to={`/users/${comment.user_id}`}
                        className="font-medium underline hover:text-slate-900"
                      >
                        {comment.user_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{comment.user_name}</span>
                    )}
                    {": "}
                    {comment.text}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportDetail;
