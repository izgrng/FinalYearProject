import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LocationPicker } from "../components/MapComponent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Camera, MapPin, FileText, Upload, X, Loader2, 
  CheckCircle2, AlertTriangle, Sparkles 
} from "lucide-react";
import { toast } from "sonner";

const ReportIssue = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    latitude: null,
    longitude: null,
    location_name: "",
    image_base64: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      setFormData({ ...formData, image_base64: base64 });
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, image_base64: null });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLocationSelect = (position) => {
    setFormData({
      ...formData,
      latitude: position.lat,
      longitude: position.lng
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error("Please select a location on the map");
      return;
    }

    if (!formData.location_name.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/reports", formData);
      setAiResult(response.data);
      setStep(3);
      toast.success("Report submitted successfully!");
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.includes("rejected")) {
        toast.error(detail);
      } else {
        toast.error("Failed to submit report");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 font-[Manrope]" data-testid="report-title">Report an Issue</h1>
          <p className="text-slate-600 mt-2">Help improve your community by reporting problems</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                step >= s 
                  ? "bg-indigo-600 text-white" 
                  : "bg-slate-200 text-slate-500"
              }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${step > s ? "bg-indigo-600" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Issue Details
              </CardTitle>
              <CardDescription>Describe the problem you've observed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Large pothole on main road"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12"
                  required
                  data-testid="report-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the issue, its severity, and any other relevant information..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px]"
                  required
                  data-testid="report-description-input"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Photo (Optional but recommended)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-48 rounded-lg mx-auto"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        data-testid="remove-image-btn"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 mb-2">Upload a photo of the issue</p>
                      <p className="text-xs text-slate-400 mb-4">JPEG, PNG or WebP, max 5MB</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="upload-image-btn"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="image-input"
                  />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI will verify the image shows a valid community issue
                </p>
              </div>

              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.title || !formData.description}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-step-btn"
              >
                Next: Select Location
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Location
              </CardTitle>
              <CardDescription>Click on the map to mark the issue location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <LocationPicker 
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={formData.latitude ? { lat: formData.latitude, lng: formData.longitude } : null}
                />
              </div>

              {formData.latitude && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">
                    Location selected: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name / Address</Label>
                <Input
                  id="location_name"
                  placeholder="e.g., Near Ratna Park, Kathmandu"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="h-12"
                  required
                  data-testid="location-name-input"
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading || !formData.latitude || !formData.location_name}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  data-testid="submit-report-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing & Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && aiResult && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted!</h2>
              <p className="text-slate-600 mb-6">Thank you for helping improve your community</p>

              <div className="bg-slate-50 rounded-xl p-6 text-left mb-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Analysis Results
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Category:</span>
                    <span className="font-medium text-indigo-600">{aiResult.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Status:</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {aiResult.status}
                    </span>
                  </div>
                  {aiResult.ai_analysis && (
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-slate-600 text-sm">AI Detection: </span>
                      <span className="text-slate-900 text-sm">{aiResult.ai_analysis}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStep(1);
                    setFormData({
                      title: "",
                      description: "",
                      latitude: null,
                      longitude: null,
                      location_name: "",
                      image_base64: null
                    });
                    setImagePreview(null);
                    setAiResult(null);
                  }}
                  className="flex-1"
                  data-testid="report-another-btn"
                >
                  Report Another Issue
                </Button>
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  data-testid="view-dashboard-btn"
                >
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReportIssue;
