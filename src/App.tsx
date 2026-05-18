import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SupportCarousel } from './components/SupportCarousel';
import { IncidentReportSection } from './components/IncidentReportSection';
import { IncidentCardList } from './components/IncidentCardList';
import { CommanderSection } from './components/CommanderSection';
import { AriaPanel } from './components/AriaPanel';
import { LocationConfirmModal } from './components/LocationConfirmModal';
import { getCurrentPosition, getRegionalLanguages, scrapeContactsForLocation } from './services/location/locationService';
import { getContactsForIncident } from './data/knowledgeBase/contactsData';
import { RecentDisastersSection } from './components/RecentDisastersSection';
import { useIncidentStore } from './store/incidentStore';
import type { EmergencyContact, IncidentCard } from './types/incident.types';
import type { ExtractedIncidentData } from './types/ai.types';

const INITIAL_INCIDENTS: IncidentCard[] = [
  {
    id: 'inc-seed-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    severity: 'critical',
    confidence: 0.96,
    status: 'ai-enriched',
    priorityScore: 98,
    requiresReview: false,
    what: { incident_type: 'Structural Collapse', damage_scale: 'catastrophic', hazards: ['Gas Leak', 'Fire'], confidence: 0.95 },
    where: { description: 'Chennai IT Corridor Sector 7', lat: 13.06, lng: 80.26, confidence: 0.98 },
    who: { count: 12, condition: 'Trapped', confidence: 0.92 },
    urgency_flags: ['IMMEDIATE EVAC', 'HAZMAT'],
    suggested_resources: ['USAR Team', 'Trauma Unit'],
    contacts: [{ name: 'TN Fire Dept', roleOrOrganization: 'HQ', phone: '101', email: 'tnfire@gov.in', category: 'Official Support' }],
    auditLog: [{ timestamp: new Date().toISOString(), action: 'enriched', actor: 'ARIA_CORE' }]
  }
];

export const App: React.FC = () => {
  const [ariaOpen, setAriaOpen] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; address?: string; region?: string; country?: string; countryCode?: string } | null>(null);
  
  const { 
    incidents, 
    setIncidents, 
    userLocation,
    setUserLocation, 
    setAvailableLanguages,
    setLanguage,
    deleteIncident,
    acknowledgeIncident
  } = useIncidentStore();

  React.useEffect(() => {
    // Initial data load or seed
    if (incidents.length === 0) {
      setIncidents(INITIAL_INCIDENTS);
    }

    const initLocation = async () => {
      try {
        const loc = await getCurrentPosition();
        setUserLocation(loc);
        setPendingLocation(loc);
        scrapeContactsForLocation(loc).catch(() => {});
        
        // Pre-fetch languages in background and set default if Tamil available
        getRegionalLanguages(loc.lat, loc.lng).then((langs) => {
          setAvailableLanguages(langs);
          if (langs.includes('Tamil')) {
            setLanguage('Tamil');
          }
        }).catch(() => {});
      } catch (err) {
        console.error('Failed to initialize location:', err);
      }
    };
    initLocation();
  }, [setUserLocation, setAvailableLanguages, setIncidents, setLanguage]);

  const mergeContacts = (...contactGroups: Array<EmergencyContact[] | undefined>): EmergencyContact[] => {
    const unique = new Map<string, EmergencyContact>()
    for (const group of contactGroups) {
      for (const contact of group || []) {
        if (!contact || typeof contact !== 'object') continue;
        const key = contact.email || contact.phone || `${contact.name}-${contact.roleOrOrganization}`
        if (!unique.has(key)) {
          unique.set(key, {
            name: String(contact.name || ''),
            roleOrOrganization: String(contact.roleOrOrganization || ''),
            phone: String(contact.phone || ''),
            email: String(contact.email || ''),
            category: String(contact.category || 'Official Support'),
          })
        }
      }
    }
    return Array.from(unique.values()).slice(0, 8)
  }

  const handleConfirmLocation = () => {
    if (pendingLocation) {
      setUserLocation(pendingLocation)
    }
    setShowLocationConfirm(false)
    setPendingLocation(null)
  }

  const handleManualLocation = (locationText: string) => {
    setUserLocation({
      ...(userLocation || pendingLocation || { lat: 0, lng: 0 }),
      address: locationText,
      region: locationText,
    })
    setShowLocationConfirm(false)
    setPendingLocation(null)
  }

  const handleIncidentExtracted = async (ext: ExtractedIncidentData) => {
    const incidentId = `inc-${Date.now()}`
    const incidentContacts = ext.contacts || []
    const initialIncident: IncidentCard = {
      id: incidentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      severity: (typeof ext.severity === 'string' ? ext.severity : 'high') as any,
      confidence: Number(ext.confidence) || 0.88,
      status: 'ai-enriched',
      priorityScore: 85,
      requiresReview: false,
      what: {
        ...(ext.what || {}),
        incident_type: typeof ext.what?.incident_type === 'string' ? ext.what.incident_type : 'Unknown',
        damage_scale: typeof ext.what?.damage_scale === 'string' ? ext.what.damage_scale : 'unverified',
        hazards: Array.isArray(ext.what?.hazards) ? ext.what.hazards.map(String) : (ext.what?.hazards ? [String(ext.what.hazards)] : []),
      },
      where: {
        description: typeof ext.where?.description === 'string' ? ext.where.description : (userLocation?.address || 'Unknown location'),
        lat: Number(ext.where?.lat ?? userLocation?.lat),
        lng: Number(ext.where?.lng ?? userLocation?.lng),
        confidence: Number(ext.where?.confidence ?? (userLocation ? 0.85 : 0)),
      },
      who: {
        count: Number(ext.who?.count || 0),
        condition: String(ext.who?.condition || 'Unknown'),
        confidence: Number(ext.who?.confidence || 0),
      },
      urgency_flags: Array.isArray(ext.urgency_flags) ? ext.urgency_flags.map(String) : (ext.urgency_flags ? [String(ext.urgency_flags)] : []),
      suggested_resources: Array.isArray(ext.suggested_resources) ? ext.suggested_resources.map(String) : (ext.suggested_resources ? [String(ext.suggested_resources)] : []),
      contacts: Array.isArray(incidentContacts) ? incidentContacts : (incidentContacts ? [incidentContacts as unknown as EmergencyContact] : []),
      auditLog: [{ timestamp: new Date().toISOString(), action: 'enriched', actor: 'ARIA_CORE' }]
    }

    setIncidents([initialIncident, ...useIncidentStore.getState().incidents])
    setTimeout(() => document.getElementById('assessed-cards')?.scrollIntoView({ behavior: 'smooth' }), 500)

    if (userLocation?.region || userLocation?.country) {
      try {
        const { backendApi } = await import('./services/api/backendClient')
        const contactsRes = await backendApi.getContacts(
          userLocation.region || userLocation.country || '',
          userLocation.countryCode
        )

        const backendContacts = (contactsRes.contacts || []).map((c) => ({
          name: c.name,
          roleOrOrganization: c.roleOrOrganization,
          phone: c.phone,
          email: c.email,
          category: c.category,
        }))

        const merged = mergeContacts(incidentContacts, backendContacts)

        if (merged.length > 0) {
          setIncidents(useIncidentStore.getState().incidents.map((inc) => inc.id === incidentId ? { ...inc, contacts: merged } : inc))
        } else {
          const fallback = getContactsForIncident(ext.what?.incident_type || initialIncident.where.description || '')
          if (fallback.length > 0) {
            setIncidents(useIncidentStore.getState().incidents.map((inc) => inc.id === incidentId ? { ...inc, contacts: mergeContacts(incidentContacts, fallback) } : inc))
          }
        }
      } catch (err) {
        console.warn('Failed to load backend contacts:', err)
        if ((incidentContacts || []).length === 0) {
          const fallback = getContactsForIncident(ext.what?.incident_type || initialIncident.where.description || '')
          setIncidents(useIncidentStore.getState().incidents.map((inc) => inc.id === incidentId ? { ...inc, contacts: mergeContacts(incidentContacts, fallback) } : inc))
        }
      }
    } else if ((incidentContacts || []).length === 0) {
      const fallback = getContactsForIncident(ext.what?.incident_type || initialIncident.where.description || '')
      setIncidents(useIncidentStore.getState().incidents.map((inc) => inc.id === incidentId ? { ...inc, contacts: mergeContacts(incidentContacts, fallback) } : inc))
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] text-[#E8F4FD] relative font-['Exo 2']">
      
      {/* Tactical HUD Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] border-[20px] border-white/[0.02] border-double" />

      <Navbar onOpenAria={() => setAriaOpen(true)} />
      
      <main className="relative">
        <HeroSection onReportClick={() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' })} onCommanderClick={() => document.getElementById('commander')?.scrollIntoView({ behavior: 'smooth' })} />
        <SupportCarousel />
        <IncidentReportSection onOpenAria={() => setAriaOpen(true)} onIncidentExtracted={handleIncidentExtracted} />
        <RecentDisastersSection />

        <div id="assessed-cards" className="scroll-mt-24">
          <IncidentCardList incidents={incidents} onDelete={deleteIncident} />
        </div>

        <CommanderSection incidents={incidents} onAcknowledge={(id) => acknowledgeIncident(id, 'CMDR_PRITHVI')} />
      </main>

      <AriaPanel 
        isOpen={ariaOpen} 
        onClose={() => setAriaOpen(false)} 
        onIncidentExtracted={handleIncidentExtracted} 
      />

      <footer className="w-full border-t border-white/5 bg-[#0D1117] py-12 px-8 mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse shadow-[0_0_10px_#00D4FF]" />
            <span className="text-sm font-black tracking-[0.1em] text-white font-['Orbitron']">RELIEFLENS TACTICAL</span>
          </div>
          <span className="text-[10px] font-black text-[#8BA3C7] tracking-[0.1em] uppercase opacity-40">
            © {new Date().getFullYear()} Disaster Decision Acceleration Node
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
