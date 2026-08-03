/**
 * PDF Export utility for Azolla ESD Platform
 * Uses jsPDF + html2canvas to capture rendered HTML → PDF
 * 
 * Usage:
 *   import { generatePdf } from '../utils/pdfExport';
 *   generatePdf('pdf-report-container', 'Tenjun_ESD_Report.pdf');
 * 
 * CDN dependencies (add to public/index.html):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
 */

export async function generatePdf(containerId, filename = 'ESD_Report.pdf', onProgress) {
  const { jsPDF } = window.jspdf;
  if (!jsPDF || !window.html2canvas) {
    alert('PDF libraries not loaded. Check index.html for jsPDF + html2canvas CDN scripts.');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) { alert('PDF container not found'); return; }

  // Show container temporarily for capture
  container.style.display = 'block';

  const pages = container.querySelectorAll('.pdf-page');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210; // A4 width mm
  const pageH = 297; // A4 height mm
  const margin = 10;
  const contentW = pageW - margin * 2;

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) onProgress(i + 1, pages.length);

    const canvas = await window.html2canvas(pages[i], {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgH = (canvas.height * contentW) / canvas.width;

    if (i > 0) pdf.addPage();

    // If content is taller than one page, scale to fit
    if (imgH > pageH - margin * 2) {
      const scale = (pageH - margin * 2) / imgH;
      const scaledW = contentW * scale;
      const scaledH = imgH * scale;
      pdf.addImage(imgData, 'JPEG', margin + (contentW - scaledW) / 2, margin, scaledW, scaledH);
    } else {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentW, imgH);
    }
  }

  // Hide container again
  container.style.display = 'none';

  pdf.save(filename);
  return true;
}