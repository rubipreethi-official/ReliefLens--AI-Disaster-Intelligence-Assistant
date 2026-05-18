import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ShieldAlert, CheckCircle2, Map } from 'lucide-react';
import { detectResourceConflicts } from '@/services/prioritisation/conflictDetector';
import 'leaflet/dist/leaflet.css';
import type { IncidentCard } from '@/types/incident.types';

interface CommanderSectionProps {
  incidents: IncidentCard[];
  onAcknowledge?: (id: string) => void;
}

export const CommanderSection: React.FC<CommanderSectionProps> = ({
  incidents,
  onAcknowledge
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [commanderMessage, setCommanderMessage] = useState('');

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  // Compute resource conflicts automatically
  const conflicts = detectResourceConflicts(incidents);

  // Default coordinate center (fallback to Chennai)
  const defaultCenter: [number, number] = [13.0827, 80.2707];

  const getMarkerColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FF2D55';
      case 'high': return '#FF6B00';
      case 'medium': return '#FFD60A';
      case 'low': default: return '#30D158';
    }
  };

  const getInstructions = (incident: IncidentCard) => {
    const type = incident.what?.incident_type?.toLowerCase() || '';
    if (type.includes('fire')) return "Evacuate upwind. Stay low to avoid smoke. Do not return for belongings.";
    if (type.includes('collapse') || type.includes('structural')) return "Move away from buildings. Watch for secondary collapses. Stay in open spaces.";
    if (type.includes('flood')) return "Move to high ground. Do not walk/drive through water. Wait for boat rescue.";
    return "Stay calm. Follow all instructions from emergency personnel. Help is inbound.";
  };

  return (
    <section id="commander" className="w-full max-w-6xl mx-auto px-4 py-16 scroll-mt-20">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
            <Map className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-wider">
              Commander Dashboard
            </h2>
            <p className="text-xs text-[#8BA3C7]">
              GIS tactical viewport with real-time priority dispatch
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="inline-flex items-center gap-4 px-4 py-2 bg-[#161B22] border border-white/[0.06] rounded-xl text-xs">
          <span className="text-[#8BA3C7]">Active Nodes</span>
          <span className="text-[#00D4FF] font-bold">{incidents.length}</span>
          <span className="w-px h-3 bg-white/[0.08]" />
          <span className="text-[#8BA3C7]">Conflicts</span>
          <span className={conflicts.length > 0 ? 'text-red-400 font-bold animate-pulse' : 'text-[#30D158] font-bold'}>
            {conflicts.length}
          </span>
        </div>
      </div>

      {/* Resource Conflict Alert */}
      {conflicts.length > 0 && (
        <div className="mb-8 w-full bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,45,85,0.08)]">
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="font-bold text-sm text-red-400">
              Resource Allocation Conflict Detected
            </span>
          </div>
          
          <p className="text-xs text-[#E8F4FD]/80 mb-4 leading-relaxed">
            Multiple incident nodes are competing for shared support teams. Manual triage routing required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conflicts.map((conf) => (
              <div key={conf.id} className="bg-[#0D1117] p-3.5 rounded-xl border border-red-500/15 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold">{conf.resourceType}</span>
                  <span className="text-[#8BA3C7] text-[10px]">{conf.conflictingIncidentIds.length} nodes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-red-400 font-medium">Unresolved</span>
                  <button 
                    onClick={() => alert(`Escalating override for: ${conf.resourceType}`)}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors"
                    id={`override-btn-${conf.id}`}
                  >
                    Force Override
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map + Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-[700px]">
        
        {/* Right Side (35%): Priority Queue */}
        <div className="lg:col-span-2 lg:order-2 flex flex-col gap-5 h-full overflow-hidden">
          <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
              <span className="text-sm font-bold text-[#E8F4FD]">
                Priority Dispatch
              </span>
              <span className="text-[11px] text-[#8BA3C7]">
                {incidents.length} active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {incidents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-[#8BA3C7]/40 text-xs italic">
                  No incidents reported yet
                </div>
              ) : (
                [...incidents]
                  .sort((a, b) => b.priorityScore - a.priorityScore)
                  .map((inc, rank) => {
                    const isSelected = selectedIncidentId === inc.id;
                    const isAcknowledged = !!inc.acknowledgedBy;
                    const isCritical = inc.severity === 'critical';

                    return (
                      <div
                        key={inc.id}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className={`w-full p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected 
                            ? 'bg-[#00D4FF]/[0.06] border-[#00D4FF]/30 shadow-[0_0_15px_rgba(0,212,255,0.08)]' 
                            : isCritical
                              ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                              : 'bg-[#161B22] border-white/[0.04] hover:border-white/[0.08]'
                        }`}
                        id={`dispatch-item-${inc.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#8BA3C7] bg-[#0D1117] px-2 py-0.5 rounded-md">
                              #{rank + 1}
                            </span>
                            <span className="text-xs font-bold text-[#E8F4FD] truncate max-w-[130px]">
                              {inc.what?.incident_type || 'Hazard'}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-black ${isCritical ? 'text-red-400' : 'text-[#00D4FF]'}`}>
                              {inc.priorityScore} PTS
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#8BA3C7]">
                          <span className="truncate max-w-[150px]">
                            {inc.where?.description || 'Location pending'}
                          </span>
                          
                          <span className={`uppercase font-bold px-1.5 rounded-md ${
                            isCritical ? 'bg-red-500/15 text-red-400' : 'text-[#8BA3C7]'
                          }`}>
                            {inc.severity}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] mt-0.5">
                          <span className="text-[10px] text-[#8BA3C7]/60 font-medium">
                            {isAcknowledged ? '✅ Acknowledged' : '⏳ Pending'}
                          </span>

                          {onAcknowledge && !isAcknowledged && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcknowledge(inc.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#30D158]/10 hover:bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 rounded-lg text-[10px] font-bold transition-colors"
                              id={`ack-btn-${inc.id}`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Acknowledge</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Commander Message Area */}
          <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-widest">Field Instruction Broadcast</span>
            <div className="flex flex-col gap-2">
              <textarea 
                value={commanderMessage}
                onChange={(e) => setCommanderMessage(e.target.value)}
                placeholder="Message for users: 'Rescue team will arrive within 10 mins. Until then, stay calm and follow these safety steps...'"
                className="w-full bg-[#050810] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#8BA3C7]/40 min-h-[80px] focus:outline-none focus:border-[#00D4FF]/30 transition-all"
              />
              <button 
                disabled={!selectedIncidentId}
                className="w-full py-2 bg-[#00D4FF] text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                onClick={() => alert(`Broadcast sent to ${selectedIncident?.id}`)}
              >
                Broadcast to Selected Node
              </button>
            </div>
          </div>
        </div>

        {/* Left Side (65%): GIS Leaflet Map */}
        <div className="lg:col-span-3 lg:order-1 rounded-2xl overflow-hidden border border-white/[0.06] bg-[#050810] relative h-full flex flex-col">
          <div className="flex-1 relative">
            <MapContainer 
              center={defaultCenter} 
              zoom={12} 
              scrollWheelZoom={true}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {incidents.map((inc) => {
                // Ensure lat/lng are strictly numbers to prevent react-leaflet NaN crashes
                let lat = Number(inc.where?.lat);
                if (isNaN(lat)) lat = defaultCenter[0] + (Number(inc.priorityScore || 85) % 10 - 5) * 0.01;
                
                let lng = Number(inc.where?.lng);
                if (isNaN(lng)) lng = defaultCenter[1] + (Number(inc.confidence || 0.8) * 10 - 5) * 0.01;
                
                const color = getMarkerColor(inc.severity);
                const isSelected = selectedIncidentId === inc.id;
                const isCritical = inc.severity === 'critical';

                return (
                  <CircleMarker
                    key={inc.id}
                    center={[lat, lng]}
                    radius={isSelected ? 14 : isCritical ? 10 : 7}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.9 : 0.5,
                      weight: isSelected ? 4 : isCritical ? 2 : 1,
                      dashArray: isCritical ? '5, 10' : undefined
                    }}
                    eventHandlers={{
                      click: () => setSelectedIncidentId(inc.id)
                    }}
                  >
                    <Popup>
                      <div className="p-2 bg-[#0D1117] text-[#E8F4FD] text-xs flex flex-col gap-1 rounded-lg min-w-[160px]">
                        <span className="font-bold text-[#00D4FF]">
                          {inc.what?.incident_type?.toUpperCase() || 'NODE'}
                        </span>
                        <span className="text-[10px] text-amber-400">
                          {inc.severity.toUpperCase()} · {inc.priorityScore} pts
                        </span>
                        <p className="text-[10px] text-[#8BA3C7] mt-1 leading-relaxed">
                          {getInstructions(inc)}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Map overlay badges */}
            <div className="absolute top-3 left-3 z-[400] pointer-events-none">
              <div className="px-3 py-1.5 bg-[#050810]/80 backdrop-blur-md border border-white/[0.08] rounded-full text-[11px] text-[#00D4FF] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                GIS Tactical Active
              </div>
            </div>
          </div>

          {/* Selected Incident Tactical Detail */}
          {selectedIncident && (
            <div className="bg-[#0D1117] border-t border-white/5 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest">Active Node Analysis</span>
                <span className="text-[10px] text-[#8BA3C7] uppercase">{selectedIncident.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-[9px] text-[#8BA3C7] uppercase block mb-1">Recommended Response</span>
                  <p className="text-xs text-white font-bold">{getInstructions(selectedIncident)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-[9px] text-[#8BA3C7] uppercase block mb-1">Commander Instructions</span>
                  <p className="text-xs text-[#00D4FF] font-mono truncate">{commanderMessage || 'No active broadcast'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </section>
  );
};
