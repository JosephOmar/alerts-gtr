// Report Types

// Common meta structure
export interface ReportMeta {
  zone: string
  date: string
  date_pe?: string
  date_es?: string
  start_interval: string | null
  end_interval: string | null
  mode?: "range" | "interval"
}

// SLA Breached Types
export interface SLABreachedAgent {
  api_email: string
  name: string
  supervisor: string
  chat_breached: number
  links: string[]
}

export interface SLABreachedSupervisor {
  supervisor: string
  coordinator: string
  chat_breached: number
  links: string[]
}

export interface SLABreachedInterval {
  interval: string
  team: string
  total_breached: number
  agents: SLABreachedAgent[]
  supervisors: SLABreachedSupervisor[]
}

export interface SLABreachedResponse {
  meta: ReportMeta
  intervals: SLABreachedInterval[]
}

// Contact Reason Types
export interface ContactReason {
  reason: string
  count: number
}

export interface ContactReasonInterval {
  interval: string
  team: string
  reasons: ContactReason[]
  total: number
}

export interface ContactReasonResponse {
  meta: ReportMeta
  intervals: ContactReasonInterval[]
}

// THT High Types
export interface THTHighAgent {
  api_email: string
  name: string
  supervisor: string
  coordinator: string
  count: number
}

export interface THTHighSupervisor {
  supervisor: string
  coordinator: string
  count: number
}

export interface THTHighInterval {
  team: string
  interval_pe: string | null
  interval_es: string | null
  agents: THTHighAgent[]
  supervisors: THTHighSupervisor[]
}

export interface THTHighResponse {
  meta: ReportMeta
  intervals: THTHighInterval[]
}

// Team options for filters
export const SLA_BREACHED_TEAMS = [
  "Customer Live",
  "Customer No Live",
  "Rider Tier1",
  "Vendor Chat",
  "Vendor Call",
  "Customer Tier2",
  "Rider Tier2",
  "Vendor Tier2",
] as const

export const CONTACT_REASON_TEAMS = [
  "Customer Tier1",
  "Rider Tier1",
  "Vendor Chat",
  "Vendor Call",
  "Customer Tier2",
  "Rider Tier2",
  "Vendor Tier2",
] as const

export const THT_HIGH_TEAMS = [
  "Customer Tier1",
  "Rider Tier1",
  "Vendor Chat",
  "Vendor Call",
  "Customer Tier2",
  "Rider Tier2",
  "Vendor Tier2",
] as const

export type SLABreachedTeam = typeof SLA_BREACHED_TEAMS[number]
export type ContactReasonTeam = typeof CONTACT_REASON_TEAMS[number]
export type THTHighTeam = typeof THT_HIGH_TEAMS[number]

// Zone options
export const ZONES = ["PE", "ES"] as const
export type Zone = typeof ZONES[number]

// Time intervals (hourly)
export const TIME_INTERVALS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
] as const

export type TimeInterval = typeof TIME_INTERVALS[number]

// CSV Queue names to filter
export const VALID_QUEUE_NAMES = [
  "VS-case-inbox-spa-ES-disputes",
  "CS-case-inbox-spa-ES-tier2",
  "VS-case-inbox-spa-ES-tier2",
  "RS-case-inbox-spa-ES-tier2",
  "RS-chat-spa-ES-tier1",
  "VS-call-default",
  "CS-chat-spa-ES-nonlive-order",
  "CS-chat-spa-ES-live-order",
  "VS-chat-spa-ES-tier1",
] as const
