"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ReportFilters } from "@/components/report-filters";
import { ReportTable } from "@/components/report-table";
import { CsvUploadModal } from "@/components/csv-upload-modal";

import {
  type SLABreachedResponse,
  type SLABreachedAgent,
  type SLABreachedSupervisor,
  SLA_BREACHED_TEAMS,
  type Zone,
} from "@/lib/report-types";

import {
  buildReportUrl,
  formatDateForApi,
  formatSLAAgentsAlertText,
  formatSLASupervisorsAlertText,
} from "@/lib/report-utils";

export default function SLABreachedPage() {
  // -----------------------------
  // Filters
  // -----------------------------
  const [zone, setZone] = useState<Zone>("PE");
  const [date, setDate] = useState<Date>(new Date());

  const [startInterval, setStartInterval] = useState<string | null>(null);
  const [endInterval, setEndInterval] = useState<string | null>(null);

  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // -----------------------------
  // Data
  // -----------------------------
  const [data, setData] = useState<SLABreachedResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Upload modal
  // -----------------------------
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // -----------------------------
  // Fetch
  // -----------------------------
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const start = startInterval || undefined;
      const end = endInterval ?? startInterval ?? undefined;

      const url = buildReportUrl(
        "/reports/sla-breached",
        zone,
        formatDateForApi(date),
        start,
        end,
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result: SLABreachedResponse = await response.json();

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [zone, date, startInterval, endInterval]);

  // -----------------------------
  // Filter intervals by team
  // -----------------------------
  const filteredIntervals =
    data?.intervals.filter(
      (interval) => selectedTeam === "all" || interval.team === selectedTeam,
    ) ?? [];

  // -----------------------------
  // Display interval
  // -----------------------------
  const intervalLabel = (() => {
    if (!startInterval) {
      return "Todo el día";
    }

    if (endInterval) {
      return `${startInterval} - ${endInterval.split(":")[0]}:59`;
    }

    const hour = startInterval.split(":")[0];

    return `${startInterval} - ${hour}:59`;
  })();

  // -----------------------------
  // Flatten agents
  // -----------------------------
  const allAgents: (SLABreachedAgent & {
    team: string;
    interval: string;
  })[] = filteredIntervals.flatMap((interval) =>
    interval.agents.map((agent) => ({
      ...agent,
      team: interval.team,
      interval: intervalLabel,
    })),
  );

  // -----------------------------
  // Flatten supervisors
  // -----------------------------
  const allSupervisors: (SLABreachedSupervisor & {
    team: string;
    interval: string;
  })[] = filteredIntervals.flatMap((interval) =>
    interval.supervisors.map((sup) => ({
      ...sup,
      team: interval.team,
      interval: intervalLabel,
    })),
  );

  // -----------------------------
  // Summary
  // -----------------------------
  const summary =
    selectedTeam === "all" && data
      ? {
          total_breached: data.meta.total_breached,

          total_agents: data.meta.total_agents,

          total_supervisors: data.meta.total_supervisors,
        }
      : {
          total_breached: filteredIntervals.reduce(
            (acc, interval) => acc + interval.total_breached,
            0,
          ),

          total_agents: filteredIntervals.reduce(
            (acc, interval) => acc + interval.total_agents,
            0,
          ),

          total_supervisors: filteredIntervals.reduce(
            (acc, interval) => acc + interval.total_supervisors,
            0,
          ),
        };

  // -----------------------------
  // Copy alerts
  // -----------------------------
  const handleCopyAgentsText = async () => {
    const text = formatSLAAgentsAlertText(
      allAgents,
      selectedTeam === "all" ? "Todos los teams" : selectedTeam,
      intervalLabel,
      zone,
    );

    await navigator.clipboard.writeText(text);
  };

  const handleCopySupervisorsText = async () => {
    const text = formatSLASupervisorsAlertText(
      allSupervisors,
      selectedTeam === "all" ? "Todos los teams" : selectedTeam,
      intervalLabel,
      zone,
    );

    await navigator.clipboard.writeText(text);
  };

  // -----------------------------
  // Copy links
  // -----------------------------
  const copyLinksToClipboard = async (links: string[]) => {
    try {
      await navigator.clipboard.writeText(links.join("\n"));
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  // -----------------------------
  // Columns
  // -----------------------------
  const agentColumns = [
    {
      key: "name",
      header: "Agente",
      sortable: true,
    },

    {
      key: "supervisor",
      header: "Supervisor",
      sortable: true,
    },

    {
      key: "chat_breached",
      header: "Cantidad",
      sortable: true,
      className: "text-center",
    },

    {
      key: "team",
      header: "Team",
      sortable: true,
    },

    {
      key: "interval",
      header: "Intervalo",
    },

    {
      key: "links",
      header: "Links",

      render: (
        item: SLABreachedAgent & {
          team: string;
          interval: string;
        },
      ) => (
        <button
          onClick={() => copyLinksToClipboard(item.links)}
          className="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-2 py-1 rounded"
        >
          Copiar ({item.links.length})
        </button>
      ),
    },
  ];

  const supervisorColumns = [
    {
      key: "supervisor",
      header: "Supervisor",
      sortable: true,
    },

    {
      key: "coordinator",
      header: "Coordinador",
      sortable: true,
    },

    {
      key: "chat_breached",
      header: "Cantidad",
      sortable: true,
      className: "text-center",
    },

    {
      key: "team",
      header: "Team",
      sortable: true,
    },

    {
      key: "interval",
      header: "Intervalo",
    },

    {
      key: "links",

      header: "Links",

      render: (
        item: SLABreachedSupervisor & {
          team: string;
          interval: string;
        },
      ) => (
        <button
          onClick={() => copyLinksToClipboard(item.links)}
          className="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-2 py-1 rounded"
        >
          Copiar ({item.links.length})
        </button>
      ),
    },
  ];

  return (
    <div className="relative z-10 p-8 max-w-7xl mx-auto">
      <Card className="border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-400/20 to-orange-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <CardTitle className="text-xl">SLA Breached</CardTitle>

              <CardDescription>
                Reporte de chats vencidos por agente y supervisor
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <ReportFilters
            zone={zone}
            setZone={setZone}
            date={date}
            setDate={setDate}
            startInterval={startInterval}
            setStartInterval={setStartInterval}
            endInterval={endInterval}
            setEndInterval={setEndInterval}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            teams={SLA_BREACHED_TEAMS}
            onRefresh={fetchData}
            onUpload={() => setUploadModalOpen(true)}
            isLoading={isLoading}
            uploadLabel="Subir SLA CSV"
          />

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />

              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />

              <span className="ml-3">Cargando datos...</span>
            </div>
          )}

          {!isLoading && data && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Total Vencidos"
                  value={summary.total_breached}
                />

                <SummaryCard label="Agentes" value={summary.total_agents} />

                <SummaryCard
                  label="Supervisores"
                  value={summary.total_supervisors}
                />

                <SummaryCard
                  label="Teams"
                  value={new Set(filteredIntervals.map((i) => i.team)).size}
                />
              </div>

              <ReportTable
                title="Agentes con SLA Breached"
                data={allAgents}
                columns={agentColumns}
                onCopyText={handleCopyAgentsText}
                copyTextLabel="Copiar Alerta"
                emptyMessage="No hay agentes con SLA breached"
              />

              <ReportTable
                title="Supervisores con SLA Breached"
                data={allSupervisors}
                columns={supervisorColumns}
                onCopyText={handleCopySupervisorsText}
                copyTextLabel="Copiar Alerta"
                emptyMessage="No hay supervisores con SLA breached"
              />
            </div>
          )}

          {!isLoading && !data && !error && (
            <div className="flex items-center justify-center p-12 border border-dashed border-slate-700 rounded-lg">
              <p className="text-muted-foreground">
                Selecciona los filtros y presiona Actualizar para ver los datos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CsvUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        endpoint="/upload-sla-breached/"
        title="Subir archivo SLA Breached"
        description="Sube el archivo CSV con los datos de SLA breached"
        onSuccess={fetchData}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="text-2xl font-bold text-cyan-400">{value}</p>
    </div>
  );
}
