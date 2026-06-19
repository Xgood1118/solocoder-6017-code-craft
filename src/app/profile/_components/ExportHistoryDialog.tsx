"use client";

import { useState, useMemo } from "react";
import { X, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { LANGUAGE_CONFIG } from "@/app/(root)/_constants";
import toast from "react-hot-toast";
import { ExportExecution } from "@/types";

interface ExportHistoryDialogProps {
  onClose: () => void;
  userId: string;
}

interface ExportQueryArgs {
  startTime?: number;
  endTime?: number;
  status?: string;
  language?: string;
}

function ExportHistoryDialog({ onClose, userId }: ExportHistoryDialogProps) {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const userStats = useQuery(api.codeExecutions.getUserStats, { userId });
  const languages = userStats?.languages || [];

  const queryArgs = useMemo<ExportQueryArgs>(() => {
    const args: ExportQueryArgs = {};
    if (startDate) args.startTime = new Date(startDate).getTime();
    if (endDate) args.endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    if (statusFilter !== "all") args.status = statusFilter;
    if (languageFilter !== "all") args.language = languageFilter;
    return args;
  }, [startDate, endDate, statusFilter, languageFilter]);

  const executions = useQuery(api.codeExecutions.getExecutionsForExport, queryArgs);

  const handleExport = () => {
    if (!executions) {
      toast.error("Data not ready yet, please wait...");
      return;
    }

    if (executions.length === 0) {
      toast.error("No executions found for the selected filters");
      return;
    }

    setIsExporting(true);
    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "json") {
        content = JSON.stringify(executions, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        const headers = ["id", "executionTime", "language", "status", "code", "output", "error"];
        const csvRows = [headers.join(",")];

        for (const exec of executions as ExportExecution[]) {
          const row = [
            exec.id,
            new Date(exec.executionTime).toISOString(),
            exec.language,
            exec.status,
            `"${(exec.code || "").replace(/"/g, '""')}"`,
            `"${(exec.output || "").replace(/"/g, '""')}"`,
            `"${(exec.error || "").replace(/"/g, '""')}"`,
          ];
          csvRows.push(row.join(","));
        }

        content = csvRows.join("\n");
        mimeType = "text/csv";
        extension = "csv";
      }

      const dateRangeStr = startDate || endDate
        ? `${startDate || "start"}_to_${endDate || "end"}`
        : "all_time";

      const fileName = `executions_${userId}_${dateRangeStr}.${extension}`;

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${executions.length} records successfully`);
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export execution history");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Export Run History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Export Format</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat("json")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  format === "json"
                    ? "bg-blue-500/20 border-blue-500 text-blue-400"
                    : "bg-[#181825] border-[#313244] text-gray-400 hover:border-gray-500"
                }`}
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={() => setFormat("csv")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  format === "csv"
                    ? "bg-blue-500/20 border-blue-500 text-blue-400"
                    : "bg-[#181825] border-[#313244] text-gray-400 hover:border-gray-500"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "success" | "error")}
              className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="error">Error Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_CONFIG[lang]?.label || lang}
                </option>
              ))}
            </select>
          </div>

          {executions !== undefined && (
            <div className="text-sm text-gray-400 bg-[#181825] rounded-lg p-3">
              {executions.length} record{executions.length !== 1 ? "s" : ""} will be exported
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || executions === undefined}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportHistoryDialog;
