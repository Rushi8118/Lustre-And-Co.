import ExcelJS from 'exceljs';

export async function createXlsxBuffer(
  sheetName: string,
  rows: Array<Record<string, unknown>>,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (!rows.length) {
    worksheet.addRow(['No data']);
    return workbook.xlsx.writeBuffer();
  }

  const columns = Object.keys(rows[0]);

  worksheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.min(40, Math.max(12, key.length + 4)),
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  worksheet.getRow(1).font = {
    bold: true,
  };

  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ];

  return workbook.xlsx.writeBuffer();
}
