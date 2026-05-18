/**
 * functionSchemas.ts
 *
 * JSON Schema definitions for Gemma 4 function calling.
 * The extract_incident_data schema matches the IncidentCard type exactly.
 */

import type { GemmaTool } from '@/types/ai.types'

/**
 * The primary function schema for incident extraction.
 * Gemma is instructed to ALWAYS call this — never respond with plain text.
 */
export const EXTRACT_INCIDENT_SCHEMA: GemmaTool = {
  function_declarations: [
    {
      name: 'extract_incident_data',
      description: 'Extract structured incident data from disaster field input (image, voice transcript, or text)',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low'],
            description: 'Assessed severity of the incident. Be conservative — choose higher when uncertain.',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Overall confidence in the severity assessment (0.0–1.0). Low quality input = lower confidence.',
          },
          who: {
            type: 'object',
            description: 'Who is affected',
            properties: {
              count: {
                type: 'number',
                description: 'Estimated number of people affected',
              },
              condition: {
                type: 'string',
                description: 'Physical condition of victims (e.g. "trapped", "minor injuries", "critical")',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence in the victim count and condition assessment',
              },
            },
          },
          what: {
            type: 'object',
            description: 'What happened',
            properties: {
              incident_type: {
                type: 'string',
                description: 'Type of incident (e.g. "structural collapse", "flood displacement", "fire")',
              },
              damage_scale: {
                type: 'string',
                enum: ['none', 'minor', 'moderate', 'major', 'catastrophic'],
                description: 'Scale of physical damage observed',
              },
              hazards: {
                type: 'array',
                items: { type: 'string' },
                description: 'Active or potential hazards (e.g. "gas leak", "secondary collapse risk")',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence in the incident type and damage assessment',
              },
            },
          },
          where: {
            type: 'object',
            description: 'Where the incident occurred',
            properties: {
              description: {
                type: 'string',
                description: 'Location description (address, landmark, area name)',
              },
              lat: {
                type: 'number',
                description: 'GPS latitude if extractable from image EXIF or description',
              },
              lng: {
                type: 'number',
                description: 'GPS longitude if extractable from image EXIF or description',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence in the location data',
              },
            },
          },
          urgency_flags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Critical urgency flags (e.g. "persons trapped", "fire spreading", "gas hazard")',
          },
          suggested_resources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Advisory resource recommendations. Will be labelled "Suggested — verify" in UI.',
          },
          contacts: {
            type: 'array',
            description: 'Professional contacts or NGOs mapped to the incident for rapid response outreach',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Contact name or primary point of contact' },
                roleOrOrganization: { type: 'string', description: 'Role or NGO name' },
                phone: { type: 'string', description: 'Contact telephone number' },
                email: { type: 'string', description: 'Contact support email address' },
                category: { type: 'string', description: 'Resource or response category' },
              },
            },
          },
          image_quality: {
            type: 'string',
            enum: ['good', 'poor', 'unusable'],
            description: 'Quality assessment of the provided image (if any)',
          },
          speech_response: {
            type: 'string',
            description: 'The spoken supportive response to the user. MUST be exactly 4 sequences: Reassurance, Action, Advice, Instruction. Do NOT include titles like "Reassurance:" or serial numbers. Speak entirely in the user\'s language.',
          },
          failure_notes: {
            type: 'string',
            description: 'Notes on why confidence is low or what information is missing',
          },
        },
        required: ['severity', 'confidence', 'what'],
      },
    },
  ],
}
