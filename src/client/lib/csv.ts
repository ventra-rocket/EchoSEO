// The pure CSV building lives in the isomorphic shared module so the audit
// export Workflow can reuse the exact same formula-injection escaping. This
// module keeps only the browser-only download helper.
export {
  buildCsv,
  normalizeExportValue,
  type CsvValue,
  type ExportValue,
} from "@/shared/csv-export";

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
