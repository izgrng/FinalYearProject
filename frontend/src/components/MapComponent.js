import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
const DEFAULT_CENTER = [27.7172, 85.3240]; // Kathmandu, Nepal

const statusTone = (status) => {
  if (status === "Fixed") return "bg-green-100 text-green-700";
  if (status === "Needs Review") return "bg-amber-100 text-amber-700";
  if (status === "Under Review") return "bg-violet-100 text-violet-700";
  if (status === "In Progress") return "bg-indigo-100 text-indigo-700";
  return "bg-orange-100 text-orange-700";
};

const createCustomIcon = (category) => {
  const color = categoryColors[category] || categoryColors.Other;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; 
      height: 32px; 
      background: ${color}; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    "><div style="
      position: absolute;
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    "></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const LocationSelector = ({ onSelect, selectedPosition }) => {
  const map = useMap();

  useEffect(() => {
    map.on("click", (e) => {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return () => {
      map.off("click");
    };
  }, [map, onSelect]);

  return selectedPosition ? (
    <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
      <Popup>Selected Location</Popup>
    </Marker>
  ) : null;
};

const FlyToPickerLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15);
    }
  }, [position, map]);
  return null;
};

const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);
  return null;
};

export const ReportMap = ({ reports, onMarkerClick, selectedReport }) => {
  const [userCenter, setUserCenter] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCenter([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocationError("Location permission denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={userCenter || DEFAULT_CENTER}
        zoom={12}
        className="w-full h-full rounded-2xl"
        style={{ minHeight: "400px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={createCustomIcon(report.category)}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(report)
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ background: categoryColors[report.category] }}
                  >
                    {report.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusTone(report.status)
                  }`}>
                    {report.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-2">{report.description}</p>
                <p className="text-xs text-slate-500 mt-1">Posted by {report.user_name || "Anonymous"}</p>
                <p className="text-xs text-slate-400 mt-2">{report.location_name}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {selectedReport && (
          <FlyToLocation position={[selectedReport.latitude, selectedReport.longitude]} />
        )}
        {userCenter && (
          <Marker position={userCenter}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        {userCenter && !selectedReport && (
          <MapCenterUpdater center={userCenter} />
        )}
      </MapContainer>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow border border-slate-200 hover:bg-white"
          disabled={locating}
        >
          {locating ? "Locating..." : "Use my location"}
        </button>
        {locationError && (
          <div className="rounded-md bg-white/90 px-3 py-1 text-xs text-red-600 shadow border border-red-100">
            {locationError}
          </div>
        )}
      </div>
    </div>
  );
};

export const LocationPicker = ({ onLocationSelect, selectedLocation, mapCenter }) => {
  const [position, setPosition] = useState(selectedLocation);
  const [initialCenter, setInitialCenter] = useState(
    selectedLocation
      ? [selectedLocation.lat, selectedLocation.lng]
      : mapCenter
        ? [mapCenter.lat, mapCenter.lng]
        : null
  );
  const [ready, setReady] = useState(Boolean(selectedLocation || mapCenter));

  const handleSelect = (pos) => {
    setPosition(pos);
    setInitialCenter([pos.lat, pos.lng]);
    setReady(true);
    onLocationSelect(pos);
  };

  useEffect(() => {
    if (selectedLocation) {
      setPosition(selectedLocation);
      setInitialCenter([selectedLocation.lat, selectedLocation.lng]);
      setReady(true);
      return;
    }
    if (mapCenter) {
      setInitialCenter([mapCenter.lat, mapCenter.lng]);
      setReady(true);
      return;
    }
    if (!navigator.geolocation) {
      setInitialCenter(defaultCenter);
      setReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(current);
        setInitialCenter([current.lat, current.lng]);
        setReady(true);
        onLocationSelect(current);
      },
      () => {
        setInitialCenter(DEFAULT_CENTER);
        setReady(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [selectedLocation, mapCenter, onLocationSelect]);

  if (!ready || !initialCenter) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Locating your current position...
      </div>
    );
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      className="w-full h-[300px] rounded-xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationSelector onSelect={handleSelect} selectedPosition={position} />
      <FlyToPickerLocation position={position || mapCenter} />
    </MapContainer>
  );
};

export const MapPreview = () => {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocationError("Location permission denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full rounded-2xl"
        style={{ minHeight: "420px" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater center={center} />
        <Marker position={center}>
          <Popup>Your current area</Popup>
        </Marker>
      </MapContainer>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow border border-slate-200 hover:bg-white"
          disabled={locating}
        >
          {locating ? "Locating..." : "Use my location"}
        </button>
        {locationError && (
          <div className="rounded-md bg-white/90 px-3 py-1 text-xs text-red-600 shadow border border-red-100">
            {locationError}
          </div>
        )}
      </div>
    </div>
  );
};

const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
};

export default ReportMap;
