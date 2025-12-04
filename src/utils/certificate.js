const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { encryptFileIfEnabled } = require('./fileCrypto');

async function generateCertificate(participante, palestra) {
  // participante: { nome, email, ra }
  // palestra: { palestraNome, data, duracaoMinutos, local, palestrante }
  
  const certificatesDir = path.join(process.cwd(), 'certificates');
  if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir, { recursive: true });

  const filename = `cert_${participante.ra || participante._id}_${Date.now()}.pdf`;
  const filepath = path.join(certificatesDir, filename);
  const logoPath = path.join(process.cwd(), 'public', 'img', 'logo_fatec.png');

  return new Promise((resolve, reject) => {
    try {
      // Configuração A4 Paisagem (Landscape)
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // --- Fundo e Bordas Sofisticadas (Cores Fatec) ---
      // Fundo levemente off-white
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');

      // Borda Externa (Vermelho Fatec)
      doc.lineWidth(10);
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke('#B22222');

      // Borda Interna (Cinza Escuro)
      doc.lineWidth(2);
      doc.rect(35, 35, pageWidth - 70, pageHeight - 70).stroke('#333333');

      // Ornamentos de Canto (Vermelho Fatec)
      doc.save();
      doc.lineWidth(2).strokeColor('#B22222');
      const cornerSize = 20;
      
      // Canto Superior Esquerdo
      doc.moveTo(35, 35 + cornerSize).lineTo(35, 35).lineTo(35 + cornerSize, 35).stroke();
      // Canto Superior Direito
      doc.moveTo(pageWidth - 35 - cornerSize, 35).lineTo(pageWidth - 35, 35).lineTo(pageWidth - 35, 35 + cornerSize).stroke();
      // Canto Inferior Esquerdo
      doc.moveTo(35, pageHeight - 35 - cornerSize).lineTo(35, pageHeight - 35).lineTo(35 + cornerSize, pageHeight - 35).stroke();
      // Canto Inferior Direito
      doc.moveTo(pageWidth - 35 - cornerSize, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 35 - cornerSize).stroke();
      doc.restore();

      // --- Cabeçalho ---
      let yPos = 80;
      if (fs.existsSync(logoPath)) {
          // Centraliza logo
          doc.image(logoPath, (pageWidth / 2) - 60, yPos - 20, { width: 120 });
          yPos += 90;
      } else {
          yPos += 40;
      }

      doc.moveDown(0);
      doc.y = yPos;

      // Título com fontes clássicas (Times)
      doc.font('Times-Bold').fontSize(42).fillColor('#B22222').text('CERTIFICADO', { align: 'center', characterSpacing: 5 });
      doc.moveDown(0.2);
      doc.font('Times-Roman').fontSize(16).fillColor('#333333').text('DE PARTICIPAÇÃO', { align: 'center', characterSpacing: 4 });

      doc.moveDown(2.5);

      // --- Corpo do Texto ---
      doc.font('Times-Roman').fontSize(20).fillColor('#333333').text('Certificamos que', { align: 'center' });
      doc.moveDown(1);

      // Nome do Participante em destaque
      doc.font('Times-BoldItalic').fontSize(32).fillColor('#000000').text(participante.nome, { align: 'center' });
      
      // Linha decorativa abaixo do nome (Vermelho Fatec)
      const textWidth = doc.widthOfString(participante.nome);
      const lineStart = (pageWidth - textWidth) / 2 - 20;
      const lineEnd = (pageWidth + textWidth) / 2 + 20;
      doc.lineWidth(1).strokeColor('#B22222');
      doc.moveTo(lineStart, doc.y).lineTo(lineEnd, doc.y).stroke();

      doc.moveDown(0.8);
      const raText = participante.ra ? `RA: ${participante.ra}` : '';
      doc.font('Helvetica').fontSize(10).fillColor('#666666').text(raText, { align: 'center' });

      doc.moveDown(2);

      // Detalhes do Evento
      const dataFormatada = palestra.data ? new Date(palestra.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Data a confirmar';
      
      let duracaoTexto = 'N/A';
      if (palestra.duracaoMinutos) {
          const horas = (Number(palestra.duracaoMinutos) / 60);
          const horasFormatadas = Number.isInteger(horas) ? horas : horas.toFixed(1);
          duracaoTexto = `${horasFormatadas} hora(s)`;
      }

      const textoPrincipal = `Participou com êxito da atividade "${palestra.palestraNome}", ministrada por ${palestra.palestrante || 'Palestrante Convidado'}, realizada em ${dataFormatada}, contabilizando carga horária total de ${duracaoTexto}.`;

      // Margens laterais para o texto não ficar muito largo
      doc.font('Times-Roman').fontSize(18).fillColor('#333333').text(textoPrincipal, 100, doc.y, { 
          align: 'center', 
          width: pageWidth - 200,
          lineGap: 6
      });

      // --- Rodapé (Sem Assinaturas, apenas validação) ---
      const yFooter = pageHeight - 50;
      const verificationCode = path.basename(filename, '.pdf');
      
      doc.fontSize(9).font('Helvetica').fillColor('#999999');
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 50, yFooter);
      doc.text(`Código de Validação: ${verificationCode}`, pageWidth - 300, yFooter, { align: 'right', width: 250 });

      doc.end();

      stream.on('finish', async () => {
        try {
          await encryptFileIfEnabled(filepath);
        } catch (encryptErr) {
          console.error('Erro ao criptografar certificado:', encryptErr.message || encryptErr);
        }
        resolve(filepath);
      });
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificate };
