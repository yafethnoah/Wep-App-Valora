
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PricingState, MaterialItem, Language } from '../types';

export const exportToPdf = (
  state: PricingState, 
  totals: { subtotal: number; profit: number; tax: number; final: number },
  lang: Language
) => {
  const doc = new jsPDF();
  const isAr = lang === Language.AR;
  
  // Basic doc setup
  doc.setFontSize(22);
  doc.text('ValoraPricing Summary', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

  // Materials Table
  const materialRows = state.materials.map(m => [
    m.name || 'Unnamed Item',
    m.quantity.toString(),
    `$${m.unitPrice.toFixed(2)}`,
    `$${(m.quantity * m.unitPrice).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Material', 'Qty', 'Unit Price', 'Total']],
    body: materialRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;

  // Labor & Summary
  doc.setFontSize(14);
  doc.text('Cost Breakdown', 14, finalY + 15);
  
  doc.setFontSize(11);
  const summaryX = 14;
  let summaryY = finalY + 25;

  const laborValue = (state.laborRate * state.laborHours) + state.fixedLabor;
  
  const summaryItems = [
    ['Labor Cost:', `$${laborValue.toFixed(2)}`],
    ['Materials Subtotal:', `$${(totals.subtotal - laborValue).toFixed(2)}`],
    ['Total Cost (Base):', `$${totals.subtotal.toFixed(2)}`],
    [`Profit Margin (${state.profitMargin}%):`, `$${totals.profit.toFixed(2)}`],
    [`Tax Provision (${state.taxRate}%):`, `$${totals.tax.toFixed(2)}`],
  ];

  summaryItems.forEach(item => {
    doc.text(item[0], summaryX, summaryY);
    doc.text(item[1], 196, summaryY, { align: 'right' });
    summaryY += 8;
  });

  doc.setLineWidth(0.5);
  doc.line(14, summaryY, 196, summaryY);
  
  summaryY += 12;
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  doc.text('Final Selling Price:', summaryX, summaryY);
  doc.text(`$${totals.final.toFixed(2)}`, 196, summaryY, { align: 'right' });

  doc.save(`ValoraPricing_Project_${Date.now()}.pdf`);
};

export const exportToExcel = (
  state: PricingState,
  totals: { subtotal: number; profit: number; tax: number; final: number }
) => {
  const materialsData = state.materials.map(m => ({
    'Material Name': m.name || 'Unnamed Item',
    'Quantity': m.quantity,
    'Unit Price': m.unitPrice,
    'Total Price': m.quantity * m.unitPrice
  }));

  const summaryData = [
    { 'Label': 'Labor Rate', 'Value': `$${state.laborRate}/hr` },
    { 'Label': 'Labor Hours', 'Value': state.laborHours },
    { 'Label': 'Fixed Labor', 'Value': `$${state.fixedLabor}` },
    { 'Label': '---', 'Value': '---' },
    { 'Label': 'Subtotal Cost', 'Value': `$${totals.subtotal.toFixed(2)}` },
    { 'Label': `Profit Margin (${state.profitMargin}%)`, 'Value': `$${totals.profit.toFixed(2)}` },
    { 'Label': `Tax Rate (${state.taxRate}%)`, 'Value': `$${totals.tax.toFixed(2)}` },
    { 'Label': 'FINAL SELLING PRICE', 'Value': `$${totals.final.toFixed(2)}` },
  ];

  const wb = XLSX.utils.book_new();
  
  const wsMaterials = XLSX.utils.json_to_sheet(materialsData);
  XLSX.utils.book_append_sheet(wb, wsMaterials, "Materials");
  
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  XLSX.writeFile(wb, `ValoraPricing_Project_${Date.now()}.xlsx`);
};
