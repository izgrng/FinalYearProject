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
  CheckCircle2, AlertTriangle, Sparkles, Navigation 
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
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const canContinueDetails = Boolean(
    formData.image_base64 || (formData.title.trim() && formData.description.trim())
  );

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
    reverseGeocode(position.lat, position.lng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setFormData((prev) => ({ ...prev, location_name: data.display_name }));
      }
    } catch (error) {
      // ignore
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data?.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        setMapCenter({ lat, lng });
        handleLocationSelect({ lat, lng });
        if (first.display_name) {
          setFormData((prev) => ({ ...prev, location_name: first.display_name }));
        }
      } else {
        toast.error("Location not found");
      }
    } catch (error) {
      toast.error("Failed to search location");
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        handleLocationSelect(coords);
        setLocating(false);
      },
      () => {
        toast.error("Unable to access your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error("Please select a location on the map");
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
        toast.error(detail || "Failed to submit report");
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
              <CardDescription>
                Submit a full text report, or upload a photo and let Fixify help build the issue details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title {!formData.image_base64 && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="title"
                  placeholder="e.g., Large pothole on main road"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12"
                  data-testid="report-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description {!formData.image_base64 && <span className="text-red-500">*</span>}</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the issue, its severity, and any other relevant information..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px]"
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
                  AI will verify the image and can generate a usable report when you upload a photo
                </p>
              </div>

              <Button 
                onClick={() => setStep(2)}
                disabled={!canContinueDetails}
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
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Search location (e.g., London, UK)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchLocation}
                    disabled={searching}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                <LocationPicker 
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={formData.latitude ? { lat: formData.latitude, lng: formData.longitude } : null}
                  mapCenter={mapCenter}
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

              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={locating}
                className="w-full"
                data-testid="use-my-location-btn"
              >
                {locating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Locating...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Use My Location
                  </>
                )}
              </Button>

              {formData.location_name && (
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Location:</span> {formData.location_name}
                </div>
              )}

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
                  disabled={loading || !formData.latitude}
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
                  {typeof aiResult.ai_confidence === "number" && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Confidence:</span>
                      <span className="font-medium text-slate-900">
                        {Math.round(aiResult.ai_confidence * 100)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Status:</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {aiResult.status}
                    </span>
                  </div>
                  {aiResult.urgency && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Urgency:</span>
                      <span className="font-medium text-slate-900 capitalize">{aiResult.urgency}</span>
                    </div>
                  )}
                  {aiResult.ai_reason && (
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-slate-600 text-sm">AI Reason: </span>
                      <span className="text-slate-900 text-sm">{aiResult.ai_reason}</span>
                    </div>
                  )}
                  {aiResult.urgency_reason && (
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-slate-600 text-sm">Urgency Note: </span>
                      <span className="text-slate-900 text-sm">{aiResult.urgency_reason}</span>
                    </div>
                  )}
                  {aiResult.ai_analysis && (
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-slate-600 text-sm">Image Analysis: </span>
                      <span className="text-slate-900 text-sm">{aiResult.ai_analysis}</span>
                    </div>
                  )}
                  {aiResult.ai_source && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">AI Source:</span>
                      <span className="text-slate-500 text-sm">{aiResult.ai_source}</span>
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
