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

// Custom markers by category
const categoryColors = {
  Waste: "#f97316",
  Road: "#6366f1",
  Water: "#0ea5e9",
  Safety: "#ef4444",
  Infrastructure: "#8b5cf6",
  Environment: "#22c55e",
  Other: "#64748b"
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
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu, Nepal

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="w-full h-full rounded-2xl"
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
                  report.status === "Open" 
                    ? "bg-orange-100 text-orange-700" 
                    : "bg-green-100 text-green-700"
                }`}>
                  {report.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-2">{report.description}</p>
              <p className="text-xs text-slate-400 mt-2">{report.location_name}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      {selectedReport && (
        <FlyToLocation position={[selectedReport.latitude, selectedReport.longitude]} />
      )}
    </MapContainer>
  );
};

export const LocationPicker = ({ onLocationSelect, selectedLocation }) => {
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu, Nepal
  const [position, setPosition] = useState(selectedLocation);

  const handleSelect = (pos) => {
    setPosition(pos);
    onLocationSelect(pos);
  };

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="w-full h-[300px] rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <LocationSelector onSelect={handleSelect} selectedPosition={position} />
    </MapContainer>
  );
};

export default ReportMap;
