/**
 * seedIncidents.ts
 *
 * Pre-seeded demonstration scenarios matching the Kaggle/Google Hackathon requirements.
 * Fully structured with dynamic priority scores, comprehensive confidence ranges,
 * pre-placed map GPS coordinates, and mapped professional contacts.
 */

import type { IncidentCard } from '@/types/incident.types'
import { getContactsForIncident } from './knowledgeBase/contactsData'

export const INITIAL_SEED_INCIDENTS: IncidentCard[] = [
  {
    id: 'inc-demo-001',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    updatedAt: new Date(Date.now() - 14 * 60000).toISOString(),
    severity: 'critical',
    confidence: 0.91,
    who: {
      count: 2,
      condition: 'Trapped under rubble, severe leg injuries reported',
      confidence: 0.90,
    },
    what: {
      incident_type: 'Structural Collapse',
      damage_scale: 'major',
      hazards: ['Secondary wall collapse risk', 'Exposed live wiring'],
      confidence: 0.88,
    },
    where: {
      description: 'Main Bazaar Road, Velachery, Chennai',
      lat: 12.9815,
      lng: 80.2180,
      confidence: 0.95,
    },
    urgency_flags: ['Persons trapped', 'Immediate heavy rescue required'],
    suggested_resources: ['Heavy Urban Search & Rescue Team', 'Advanced Trauma Medical Unit', 'Structural Engineer'],
    contacts: getContactsForIncident('collapse earthquake trapped'),
    image_quality: 'good',
    voiceTranscript: 'Two people trapped, leg injury. Floor completely collapsed.',
    textInput: 'Rendu per sirikkinaanga, kaal moodi iruku. Wall crack heavily visible.',
    status: 'ai-enriched',
    priorityScore: 0.87,
    requiresReview: false,
    auditLog: [
      {
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        action: 'created',
        actor: 'Field Volunteer #104',
        notes: 'Captured via offline WASM voice layer',
      },
      {
        timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
        action: 'enriched',
        actor: 'ARIA Agent',
        notes: 'Enriched via Google AI Studio multimodal endpoint',
      },
    ],
  },
  {
    id: 'inc-demo-002',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(), // 45 mins ago
    updatedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    severity: 'high',
    confidence: 0.78,
    who: {
      count: 1200,
      condition: 'Stranded on rooftops, acute food/water insecurity',
      confidence: 0.75,
    },
    what: {
      incident_type: 'Flood Mass Displacement',
      damage_scale: 'major',
      hazards: ['Rapidly rising water levels', 'Waterborne disease outbreak risk'],
      confidence: 0.80,
    },
    where: {
      description: 'Low-lying sectors, Tambaram West, Chennai',
      lat: 12.9249,
      lng: 80.1100,
      confidence: 0.85,
    },
    urgency_flags: ['Mass displacement', 'Critical supply shortage'],
    suggested_resources: ['Evacuation Flat-bottom Boats', 'Relief Camp Logistics', 'Clean Water Tankers'],
    contacts: getContactsForIncident('flood rising water stranded'),
    image_quality: 'poor',
    textInput: '300 families stranded, water level rising rapidly, no food or drinking water since yesterday afternoon.',
    status: 'ai-enriched',
    priorityScore: 0.71,
    requiresReview: false,
    auditLog: [
      {
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        action: 'created',
        actor: 'District Triage SMS Gateway',
      },
      {
        timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
        action: 'enriched',
        actor: 'ARIA Agent',
      },
    ],
  },
  {
    id: 'inc-demo-003',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins ago
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    severity: 'medium',
    confidence: 0.85,
    who: {
      count: 15,
      condition: 'Minor smoke inhalation, preliminary evacuation successful',
      confidence: 0.85,
    },
    what: {
      incident_type: 'Industrial Warehouse Chemical Smoke',
      damage_scale: 'moderate',
      hazards: ['Toxic chemical fumes', 'Combustible storage nearby'],
      confidence: 0.85,
    },
    where: {
      description: 'Industrial Estate, Guindy, Chennai',
      lat: 13.0102,
      lng: 80.2156,
      confidence: 0.90,
    },
    urgency_flags: ['Chemical hazard', 'Air quality risk'],
    suggested_resources: ['Hazmat Response Unit', 'Breathing Apparatus Support', 'Ambulance standby'],
    contacts: getContactsForIncident('fire smoke gas leak chemical'),
    image_quality: 'good',
    textInput: 'Thick yellowish smoke emerging from chemical distribution warehouse. Strong acidic odor.',
    status: 'ai-enriched',
    priorityScore: 0.52,
    requiresReview: false,
    auditLog: [
      {
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        action: 'created',
        actor: 'Patrol Response Unit #4',
      },
      {
        timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
        action: 'enriched',
        actor: 'ARIA Agent',
      },
    ],
  },
]
