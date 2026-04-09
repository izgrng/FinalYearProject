import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { MapPin, ThumbsUp } from "lucide-react";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublicProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, reportsRes] = await Promise.all([
          axios.get(`${API_URL}/users/${id}`),
          axios.get(`${API_URL}/reports/user/${id}`)
        ]);
        setUser(userRes.data);
        setReports(reportsRes.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">User not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-slate-900 font-[Manrope]">{user.full_name}</h1>
            <div className="flex items-center gap-3 mt-2 text-slate-600">
              <Badge variant="secondary">{user.role === "moderator" ? "Moderator" : "Member"}</Badge>
              {user.is_community_member && (
                <Badge className="bg-green-100 text-green-700">Community Member</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Reports by {user.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-slate-600">No reports yet.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-slate-800 text-white">{report.category}</Badge>
                      <span className="text-xs text-slate-500">{report.created_at?.slice(0, 10)}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">{report.description}</p>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfile;
