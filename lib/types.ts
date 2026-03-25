export interface QueueData {
  activeTicketsCount: number
  avgHandlingTime: number
  avgWaitTime: number
  casesBacklog: number
  channel: string
  country: string
  department: string
  expertise: string
  id: string
  language: string
  longestWaitTime: number
  onlineAgentCount: number
  queueName: string
  totalAgentCount: number
}

export interface ApiResponse {
  cursor: {
    currentPage: string
    nextPage: string
    previousPages: string[]
  }
  list: QueueData[]
  pageSize: number
}

export interface TableRow {
  channel: string
  backlog: number
  tickets: number
  head: number
}

// Extended types for detailed capacity info
export interface ChannelCapacityInfo {
  name: string
  totalAgents: number
  controlAgents: number
  liveAgents: number
  totalTickets: number
  nonLiveTickets: number
  liveTickets: number
  concurrency: number
  thtNonLive: string
  thtLive: string
  thtNonLiveSeconds: number
  thtLiveSeconds: number
  availableAgents: number
}

export interface SimpleTier1Info {
  name: string
  onlineAgents: number
  tickets: number
  concurrency: number
  tht: string
  thtSeconds: number
  availableAgents: number
}

export interface Tier2BacklogInfo {
  customer: {
    cases: number
    hoursToSLA: number
  }
  rider: {
    cases: number
    hoursToSLA: number
  }
  vendor: {
    cases: number
    hoursToSLA: number
  }
  disputes: {
    cases: number
  }
}

// THT Ticket types
export interface THTTicket {
  id: string
  agent: string
  handlingTime: number
  channel: string
  department: string
  queueName: string
  chatStatus: string
  assignedTimestamp: number
  requestedTimestamp: number
  organization: string
  teamName: string
}

export interface THTTicketResponse {
  cursor: {
    currentPage: string
    nextPage: string
    previousPages: string[]
  }
  tickets: THTTicket[]
}

export interface THTAlertInfo {
  ticketId: string
  agentName: string
  teamName: string
  company: string
  handlingTimeSeconds: number
  handlingTimeFormatted: string
  caseLink: string
  supervisor: string | null
  workerFound: boolean
}

// Agent Monitor types for Adherence
export interface AgentMonitorAgent {
  id: string
  email: string
  name: string
  statusAlias: string
  timeInStatus: number
  channelCases: unknown[]
}

export interface AgentMonitorResponse {
  agents: AgentMonitorAgent[]
  token: {
    currentPage: string
    nextPage: string
    previousPages: string[]
  }
}

export interface AuxiliarAlertInfo {
  agentEmail: string
  agentName: string
  teamName: string
  supervisor: string | null
  statusAlias: string
  statusFormatted: string
  timeInStatus: number
  timeFormatted: string
}
