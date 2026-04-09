import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { MapPin, ThumbsUp, MessageSquare, ArrowLeft } from "lucide-react";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
