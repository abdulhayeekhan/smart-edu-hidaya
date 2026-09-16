import html2pdf from 'html2pdf.js';

export interface ExportColumn {
  title: string;
  dataIndex: string;
  render?: (text?: any, record?: any, index?: any) => any;
}

export const exportToPDF = (title: string, columns: ExportColumn[], data: any[]) => {
  const filteredCols = columns.filter(col => col.title !== 'Action');

  const tableHtml = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #1e3a8a;">${title}</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background-color: #2e5b88; color: #ffffff;">
            ${filteredCols
              .map(col => `<th style="border: 1px solid #1c3b5e; padding: 6px 8px; text-align: left;">${col.title}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (item, rIdx) => `
            <tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f7f9fc'};">
              ${filteredCols
                .map(col => {
                  let val = item[col.dataIndex];
                  if (col.render) {
                    try {
                      const rendered = col.render(val, item, rIdx);
                      if (typeof rendered === 'string' || typeof rendered === 'number') {
                        val = rendered;
                      } else if (typeof val === 'boolean') {
                        val = val ? 'Active' : 'Inactive';
                      } else {
                        val = item[col.dataIndex] || '';
                      }
                    } catch (e) {
                      val = item[col.dataIndex] || '';
                    }
                  } else if (typeof val === 'boolean') {
                    val = val ? 'Active' : 'Inactive';
                  }
                  return `<td style="border: 1px solid #ddd; padding: 5px 8px;">${val !== undefined && val !== null ? String(val) : ''}</td>`;
                })
                .join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; font-size: 8px; text-align: right; color: #666;">
        Generated on: ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = tableHtml;

  const opt = {
    margin: 0.4,
    filename: `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const }
  };

  html2pdf().from(element).set(opt).save();
};

export const exportToExcel = (title: string, columns: ExportColumn[], data: any[]) => {
  const filteredCols = columns.filter(col => col.title !== 'Action');
  
  const headers = filteredCols.map(col => col.title);
  
  const rows = data.map((item, rIdx) => {
    return filteredCols.map(col => {
      let val = item[col.dataIndex];
      if (col.render) {
        try {
          const rendered = col.render(val, item, rIdx);
          if (typeof rendered === 'string' || typeof rendered === 'number') {
            val = rendered;
          } else if (typeof val === 'boolean') {
            val = val ? 'Active' : 'Inactive';
          } else {
            val = item[col.dataIndex] || '';
          }
        } catch (e) {
          val = item[col.dataIndex] || '';
        }
      } else if (typeof val === 'boolean') {
        val = val ? 'Active' : 'Inactive';
      }
      return val !== undefined && val !== null ? String(val) : '';
    });
  });

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${title.replace(/[:\\/?*\[\]]/g, '').slice(0, 31)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
          th { background-color: #2e5b88; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #1c3b5e; text-align: left; }
          td { padding: 6px 12px; border: 1px solid #d9d9d9; }
          tr:nth-child(even) td { background-color: #f7f9fc; }
          .title-row { font-size: 14pt; font-weight: bold; text-align: center; height: 35px; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="${headers.length}" class="title-row">${title}</td>
          </tr>
          <tr></tr>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell ? cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportDOMTableToPDF = (defaultTitle?: string) => {
  const table = document.querySelector(".ant-table-content table, .ant-table-wrapper table, .table-responsive table, table") as HTMLTableElement | null;
  if (!table) {
    window.print();
    return;
  }
  const title = defaultTitle || document.querySelector(".page-title, h3, h4")?.textContent?.trim() || "Report";

  const ths = Array.from(table.querySelectorAll("thead th, thead td"));
  const validColIndices: number[] = [];
  const headers: string[] = [];

  ths.forEach((th, idx) => {
    const text = th.textContent?.trim() || "";
    if (text && !text.toLowerCase().includes("action") && !th.querySelector("input[type='checkbox']")) {
      validColIndices.push(idx);
      headers.push(text);
    }
  });

  const trs = Array.from(table.querySelectorAll("tbody tr"));
  const rowsData: string[][] = [];

  trs.forEach(tr => {
    if (tr.classList.contains("ant-table-placeholder") || tr.querySelector(".ant-empty")) return;
    const tds = Array.from(tr.querySelectorAll("td, th"));
    if (tds.length === 0) return;

    const row: string[] = [];
    validColIndices.forEach(idx => {
      const td = tds[idx];
      if (!td) {
        row.push("");
        return;
      }
      const checkbox = td.querySelector("input[type='checkbox']") as HTMLInputElement | null;
      if (checkbox) {
        row.push(checkbox.checked ? "Active" : "Inactive");
      } else {
        const textVal = (td as HTMLElement).innerText !== undefined ? (td as HTMLElement).innerText : (td.textContent || "");
        row.push(textVal.trim().replace(/\n+/g, " "));
      }
    });
    if (row.some(c => c.length > 0)) {
      rowsData.push(row);
    }
  });

  const tableHtml = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #1e3a8a;">${title}</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background-color: #2e5b88; color: #ffffff;">
            ${headers.map(h => `<th style="border: 1px solid #1c3b5e; padding: 6px 8px; text-align: left;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsData.map((row, rIdx) => `
            <tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f7f9fc'};">
              ${row.map(cell => `<td style="border: 1px solid #ddd; padding: 5px 8px;">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; font-size: 8px; text-align: right; color: #666;">
        Generated on: ${new Date().toLocaleString()}
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = tableHtml;

  const opt = {
    margin: 0.4,
    filename: `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const }
  };

  html2pdf().from(element).set(opt).save();
};

export const exportDOMTableToExcel = (defaultTitle?: string) => {
  const table = document.querySelector(".ant-table-content table, .ant-table-wrapper table, .table-responsive table, table") as HTMLTableElement | null;
  if (!table) return;
  const title = defaultTitle || document.querySelector(".page-title, h3, h4")?.textContent?.trim() || "Report";

  const ths = Array.from(table.querySelectorAll("thead th, thead td"));
  const validColIndices: number[] = [];
  const headers: string[] = [];

  ths.forEach((th, idx) => {
    const text = th.textContent?.trim() || "";
    if (text && !text.toLowerCase().includes("action") && !th.querySelector("input[type='checkbox']")) {
      validColIndices.push(idx);
      headers.push(text);
    }
  });

  const trs = Array.from(table.querySelectorAll("tbody tr"));
  const rowsData: string[][] = [];

  trs.forEach(tr => {
    if (tr.classList.contains("ant-table-placeholder") || tr.querySelector(".ant-empty")) return;
    const tds = Array.from(tr.querySelectorAll("td, th"));
    if (tds.length === 0) return;

    const row: string[] = [];
    validColIndices.forEach(idx => {
      const td = tds[idx];
      if (!td) {
        row.push("");
        return;
      }
      const checkbox = td.querySelector("input[type='checkbox']") as HTMLInputElement | null;
      if (checkbox) {
        row.push(checkbox.checked ? "Active" : "Inactive");
      } else {
        const textVal = (td as HTMLElement).innerText !== undefined ? (td as HTMLElement).innerText : (td.textContent || "");
        row.push(textVal.trim().replace(/\n+/g, " "));
      }
    });
    if (row.some(c => c.length > 0)) {
      rowsData.push(row);
    }
  });

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 11pt; }
          th { background-color: #2e5b88; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #1c3b5e; text-align: left; }
          td { padding: 6px 12px; border: 1px solid #d9d9d9; }
          tr:nth-child(even) td { background-color: #f7f9fc; }
          .title-row { font-size: 14pt; font-weight: bold; text-align: center; height: 35px; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="${headers.length}" class="title-row">${title}</td>
          </tr>
          <tr></tr>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsData.map(row => `<tr>${row.map(cell => `<td>${cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
