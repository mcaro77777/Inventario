export interface ExportOptions {
  autoWidth?: boolean;
  headerFgColor?: string; // RGB hex without #
  headerFontColor?: string; // RGB hex without #
}

export async function exportAoaToXlsx(
  aoa: any[][],
  sheetName: string,
  fileName: string,
  opts: ExportOptions = {}
): Promise<void> {
  const mod = await import('xlsx-js-style');
  const XLSX = (mod as any).default ?? mod;

  const ws: any = XLSX.utils.aoa_to_sheet(aoa);
  const headerLen = (aoa?.[0]?.length ?? 0);
  if (headerLen > 0) {
    (ws as any)['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headerLen - 1 } })
    };
  }

  if (opts.autoWidth !== false && headerLen > 0) {
    const colWidths = aoa[0].map((_: any, cIdx: number) => {
      const max = aoa.reduce((m, row) => Math.max(m, String(row?.[cIdx] ?? '').length), 0);
      return { wch: Math.min(Math.max(max + 2, 6), 80) };
    });
    (ws as any)['!cols'] = colWidths;
  }

  // Header style (row 0)
  const headerFg = opts.headerFgColor ?? '1F4E78';
  const headerFont = opts.headerFontColor ?? 'FFFFFF';
  for (let c = 0; c < headerLen; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) {
      (ws[ref] as any).s = {
        fill: { fgColor: { rgb: headerFg } },
        font: { bold: true, color: { rgb: headerFont } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }

  const wb: any = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName, { cellStyles: true });
}
