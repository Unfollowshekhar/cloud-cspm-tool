import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { EmptyState } from "@/components/shared";
import { GlobeHemisphereWest, Clock } from "@phosphor-icons/react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";

const TYPE_COLORS = {
  "brute-force": "#FF3B30",
  "ssh-brute-force": "#FF3B30",
  "rdp-brute-force": "#FF3B30",
  "scanning": "#FF9500",
  "malware": "#AF52DE",
  "malware-c2": "#AF52DE",
  "spam": "#FFCC00",
  "web-attack": "#FF2D55",
};

export default function ThreatMapPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const [evRes, stRes] = await Promise.all([api.getThreatLive(), api.getThreatStats()]);
      setEvents(evRes.data.events || []);
      setStats(stRes.data);
      setLastUpdated(new Date());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#333333] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const countryData = stats?.top_attacking_countries || [];
  const typeData = stats?.threats_by_type
    ? Object.entries(stats.threats_by_type).map(([name, value]) => ({
        name,
        value,
        color: TYPE_COLORS[name] || "#666",
      }))
    : [];

  return (
    <div data-testid="threat-map-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">Live Global Threat Intelligence</h1>
          <p className="text-[#A1A1AA] text-sm">
            Real-time cyberattack data from open threat intelligence feeds
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-[#71717A] text-xs">
            <Clock size={12} />
            <span className="font-['JetBrains_Mono']">Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm overflow-hidden mb-6" data-testid="threat-map-container" style={{ height: 400 }}>
        <MapContainer
          center={[25, 10]}
          zoom={2}
          style={{ height: "100%", width: "100%", background: "#050505" }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          {events.map((e, i) =>
            e.lat && e.lon ? (
              <CircleMarker
                key={i}
                center={[e.lat, e.lon]}
                radius={6}
                pathOptions={{
                  color: TYPE_COLORS[e.threat_type] || "#FF3B30",
                  fillColor: TYPE_COLORS[e.threat_type] || "#FF3B30",
                  fillOpacity: 0.6,
                  weight: 1,
                }}
              >
                <Popup>
                  <div style={{ color: "#333", fontSize: 12 }}>
                    <strong>{e.ip}</strong><br />
                    {e.country} ({e.countryCode})<br />
                    ISP: {e.isp}<br />
                    Source: {e.source}<br />
                    Type: {e.threat_type}
                  </div>
                </Popup>
              </CircleMarker>
            ) : null
          )}
        </MapContainer>
      </div>

      <p className="text-[#71717A] text-xs mb-6 font-['JetBrains_Mono']">
        Data: Blocklist.de | CINS Army | ip-api.com &mdash; Updated every 15 minutes. For educational use.
      </p>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="country-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Top Attacking Countries</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={countryData} barSize={24} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="country" tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222222", borderRadius: "2px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#fff" }} />
              <Bar dataKey="count" fill="#FF3B30" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="type-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Threat Type Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none" label={({ name, value }) => `${name}: ${value}`}>
                {typeData.map((e, i) => (<Cell key={i} fill={e.color} />))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222222", borderRadius: "2px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feed Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="threat-feed-table">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Live Threat Feed</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#222222]">
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Timestamp</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">IP Address</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Country</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Source</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 20).map((e, i) => {
                const age = e.timestamp ? (Date.now() - new Date(e.timestamp).getTime()) / 60000 : 999;
                const rowColor = age < 5 ? "text-[#FF3B30]" : age < 30 ? "text-[#FF9500]" : "text-[#A1A1AA]";
                return (
                  <tr key={i} className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150">
                    <td className={`py-2.5 pr-4 font-['JetBrains_Mono'] text-xs ${rowColor}`}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-2.5 pr-4 font-['JetBrains_Mono'] text-xs text-white">{e.ip}</td>
                    <td className="py-2.5 pr-4 text-xs text-[#A1A1AA]">{e.country}</td>
                    <td className="py-2.5 pr-4 font-['JetBrains_Mono'] text-xs text-[#71717A]">{e.source}</td>
                    <td className="py-2.5 font-['JetBrains_Mono'] text-xs text-[#71717A]">{e.threat_type}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
