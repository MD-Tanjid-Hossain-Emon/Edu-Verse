// utils/certificate.js
// Generates a certificate-of-completion PDF using pdfkit and streams it
// straight to the HTTP response (no temp file needed).

const PDFDocument = require('pdfkit');

function streamCertificate(res, { studentName, courseTitle, dateStr, certId }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="EduVerse-Certificate-${certId}.pdf"`);

  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
  doc.pipe(res);

  const { width, height } = doc.page;

  // Background
  doc.rect(0, 0, width, height).fill('#0B1F4B');

  // Inner decorative border
  const margin = 28;
  doc
    .lineWidth(2)
    .strokeColor('#F5A623')
    .rect(margin, margin, width - margin * 2, height - margin * 2)
    .stroke();
  doc
    .lineWidth(0.75)
    .strokeColor('#3D5AFE')
    .rect(margin + 10, margin + 10, width - (margin + 10) * 2, height - (margin + 10) * 2)
    .stroke();

  doc.fillColor('#F5A623').fontSize(14).font('Helvetica-Bold');
  doc.text('EDUVERSE', 0, 70, { align: 'center', characterSpacing: 6 });

  doc.fillColor('#9FB3FF').fontSize(11).font('Helvetica');
  doc.text('A UNIVERSE OF LEARNING OPPORTUNITIES', 0, 92, { align: 'center', characterSpacing: 2 });

  doc.fillColor('#FFFFFF').fontSize(30).font('Helvetica-Bold');
  doc.text('Certificate of Completion', 0, 140, { align: 'center' });

  doc.fillColor('#C9D3F0').fontSize(13).font('Helvetica');
  doc.text('This certifies that', 0, 195, { align: 'center' });

  doc.fillColor('#F5A623').fontSize(26).font('Helvetica-Bold');
  doc.text(studentName, 0, 220, { align: 'center' });

  doc.fillColor('#C9D3F0').fontSize(13).font('Helvetica');
  doc.text('has successfully completed the course', 0, 262, { align: 'center' });

  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold');
  doc.text(courseTitle, 60, 288, { align: 'center', width: width - 120 });

  doc.fillColor('#9FB3FF').fontSize(10).font('Helvetica');
  doc.text(`Issued on ${dateStr}  ·  Certificate ID: ${certId}`, 0, height - 90, { align: 'center' });

  doc
    .moveTo(width / 2 - 90, height - 60)
    .lineTo(width / 2 + 90, height - 60)
    .lineWidth(0.75)
    .strokeColor('#3D5AFE')
    .stroke();
  doc.fillColor('#C9D3F0').fontSize(9).text('EduVerse Learning Platform', 0, height - 52, { align: 'center' });

  doc.end();
}

module.exports = { streamCertificate };
