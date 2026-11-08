import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatETB } from './formatters';

export function exportToExcel(reportTitle, columns, rows, filename = 'bakery-report') {
  // Map rows to match columns
  const formattedData = rows.map((row) => {
    const item = {};
    columns.forEach((col) => {
      item[col.header] = row[col.key];
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToPDF(reportTitle, subtitle, columns, rows, filename = 'bakery-report') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Styling
  doc.setFillColor(180, 83, 9); // Amber 700
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HARBUU BAKERY MANAGEMENT SYSTEM', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Integrated Production, Sales & Financial Platform', 14, 18);

  // Report Title and Subtitle
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(reportTitle.toUpperCase(), 14, 34);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 40);
  }

  // Generation timestamp
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const genDate = `Generated: ${new Date().toLocaleString()}`;
  doc.text(genDate, 196 - doc.getTextWidth(genDate), 40);

  // Table
  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) => columns.map((c) => {
    const val = row[c.key];
    if (c.isCurrency) return formatETB(val);
    return val !== undefined && val !== null ? String(val) : '';
  }));

  autoTable(doc, {
    head: head,
    body: body,
    startY: subtitle ? 44 : 38,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [217, 119, 6], // Amber 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [254, 252, 232], // Soft amber tint
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
