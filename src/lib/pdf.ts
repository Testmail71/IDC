import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { amountInWords, formatDate } from "@/lib/utils";

const SAFFRON = rgb(0.85, 0.36, 0.05);
const MAROON = rgb(0.45, 0.08, 0.11);
const GOLD = rgb(0.78, 0.56, 0.16);
const DARK = rgb(0.15, 0.12, 0.12);
const MUTED = rgb(0.45, 0.42, 0.42);
const LIGHT = rgb(0.92, 0.9, 0.88);

export interface ReceiptData {
  templeName: string;
  centerName: string;
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  registrationNumber: string;
  amount: number;
  currencyCode: string;
  methodLabel: string;
  transactionReference: string | null;
  previousOutstanding: number;
  remainingOutstanding: number;
  totalFee: number;
  receiverName: string;
  statusLabel: string;
  issuedAt: string;
}

const PAGE_W = 595.28; // A4 width (pt)
const PAGE_H = 841.89; // A4 height (pt)
const MARGIN = 48;

function drawHeader(
  page: import("pdf-lib").PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  data: ReceiptData,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 4,
    width: PAGE_W,
    height: 4,
    color: SAFFRON,
  });
  page.drawText("IDC PAYMENT RECEIPT", {
    x: MARGIN,
    y: PAGE_H - 62,
    size: 20,
    font: fontBold,
    color: MAROON,
  });
  page.drawText(data.templeName, {
    x: MARGIN,
    y: PAGE_H - 86,
    size: 12,
    font: fontBold,
    color: DARK,
  });
  page.drawText(data.centerName, {
    x: MARGIN,
    y: PAGE_H - 102,
    size: 9.5,
    font: fontRegular,
    color: MUTED,
  });
  page.drawText(`Receipt No.: ${data.receiptNumber}`, {
    x: PAGE_W - MARGIN - 170,
    y: PAGE_H - 62,
    size: 11,
    font: fontBold,
    color: SAFFRON,
  });
  page.drawText(`Status: ${data.statusLabel}`, {
    x: PAGE_W - MARGIN - 170,
    y: PAGE_H - 78,
    size: 9.5,
    font: fontRegular,
    color: MUTED,
  });
  page.drawText(`Issued: ${data.issuedAt}`, {
    x: PAGE_W - MARGIN - 170,
    y: PAGE_H - 94,
    size: 9.5,
    font: fontRegular,
    color: MUTED,
  });
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_H - 122,
    width: PAGE_W - MARGIN * 2,
    height: 1,
    color: GOLD,
  });
}

function drawInfoRow(
  page: import("pdf-lib").PDFPage,
  y: number,
  label: string,
  value: string,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  valueColor: ReturnType<typeof rgb> = DARK,
  valueSize = 10.5,
) {
  page.drawText(label, {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: MUTED,
  });
  page.drawText(value, {
    x: MARGIN + 170,
    y,
    size: valueSize,
    font: fontRegular,
    color: valueColor,
  });
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  drawHeader(page, fontBold, fontRegular, data);

  let y = PAGE_H - 150;
  drawInfoRow(page, y, "Student Name", data.studentName, fontBold, fontRegular);
  y -= 20;
  drawInfoRow(
    page,
    y,
    "IDC Registration No.",
    data.registrationNumber,
    fontBold,
    fontRegular,
  );
  y -= 20;
  drawInfoRow(
    page,
    y,
    "Payment Date",
    formatDate(data.paymentDate),
    fontBold,
    fontRegular,
  );
  y -= 20;
  drawInfoRow(
    page,
    y,
    "Payment Method",
    data.methodLabel,
    fontBold,
    fontRegular,
  );
  y -= 20;
  drawInfoRow(
    page,
    y,
    "Transaction Reference",
    data.transactionReference || "N/A",
    fontBold,
    fontRegular,
  );
  y -= 20;
  drawInfoRow(
    page,
    y,
    "Received By",
    data.receiverName || "—",
    fontBold,
    fontRegular,
  );

  // Summary box
  y -= 40;
  page.drawRectangle({
    x: MARGIN,
    y,
    width: PAGE_W - MARGIN * 2,
    height: 150,
    color: LIGHT,
    borderColor: GOLD,
    borderWidth: 1,
  });
  const boxTop = y + 124;

  const summaryRows: Array<[string, string]> = [
    ["Amount Received", `Rs. ${data.amount.toFixed(2)}`],
    ["Total Course Fee", `Rs. ${data.totalFee.toFixed(2)}`],
    ["Previous Outstanding Balance", `Rs. ${data.previousOutstanding.toFixed(2)}`],
    ["Remaining Outstanding Balance", `Rs. ${data.remainingOutstanding.toFixed(2)}`],
  ];
  let rowY = boxTop - 18;
  summaryRows.forEach(([label, value], index) => {
    page.drawText(label, {
      x: MARGIN + 16,
      y: rowY,
      size: 10,
      font: fontBold,
      color: index === 0 ? SAFFRON : index === 3 ? MAROON : DARK,
    });
    page.drawText(value, {
      x: PAGE_W - MARGIN - 120,
      y: rowY,
      size: 10.5,
      font: index === 0 ? fontBold : fontRegular,
      color: index === 3 ? MAROON : DARK,
    });
    rowY -= 20;
  });

  const words = amountInWords(data.amount, "Rupees");
  page.drawText(`Amount in words:`, {
    x: MARGIN + 16,
    y: boxTop - 94,
    size: 9,
    font: fontBold,
    color: MUTED,
  });
  page.drawText(words, {
    x: MARGIN + 16,
    y: boxTop - 106,
    size: 10,
    font: fontRegular,
    color: DARK,
  });

  y -= 190;

  page.drawText(
    "This receipt is generated from verified payment records of the IDC portal.",
    { x: MARGIN, y, size: 8.5, font: fontRegular, color: MUTED },
  );
  y -= 14;
  page.drawText(
    "Keep this receipt safely. For queries contact the IDC administration.",
    { x: MARGIN, y, size: 8.5, font: fontRegular, color: MUTED },
  );

  // Signature line
  page.drawText("Authorised Signatory", {
    x: PAGE_W - MARGIN - 170,
    y: MARGIN + 20,
    size: 10,
    font: fontBold,
    color: DARK,
  });
  page.drawText(data.receiverName || "", {
    x: PAGE_W - MARGIN - 170,
    y: MARGIN + 6,
    size: 9,
    font: fontRegular,
    color: MUTED,
  });
  page.drawLine({
    start: { x: PAGE_W - MARGIN - 170, y: MARGIN + 34 },
    end: { x: PAGE_W - MARGIN - 30, y: MARGIN + 34 },
    thickness: 0.5,
    color: MUTED,
  });

  return doc.save();
}