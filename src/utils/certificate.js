const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateCertificate(participante, palestra) {
  // participante: { nome, email, ra }
  // palestra: { id, nome, data }
  const certificatesDir = path.join(process.cwd(), 'certificates');
  if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

  const filename = `cert_${participante.ra || participante._id}_${Date.now()}.pdf`;
  const filepath = path.join(certificatesDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      doc.fontSize(20).text('Certificado de Participação', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text(`Certificamos que ${participante.nome}`);
      doc.moveDown(0.5);
      doc.text(`RA: ${participante.ra || '-'} - E-mail: ${participante.email || '-'} `);
      doc.moveDown(1);
      doc.text(`Participou da palestra: ${palestra.nome || palestra.palestraNome || palestra}`);
      if (palestra.data) doc.moveDown(0.5).text(`Data: ${new Date(palestra.data).toLocaleString()}`);

      doc.moveDown(2);
      doc.text('Assinatura: ___________________________', { align: 'right' });

      doc.end();

      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificate };
