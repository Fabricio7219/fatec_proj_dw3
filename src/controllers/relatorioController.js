const PDFDocument = require("pdfkit");
const Participante = require("../models/Participante");

/**
 * Função auxiliar para formatar tempo em "Xh Ymin"
 */
function formatarTempo(minutos) {
  if (!minutos || minutos === 0) return "0min";
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
}

/**
 * Relatório geral de participantes em PDF
 */
async function gerarRelatorioParticipantesPDF(req, res) {
  try {
    const participantes = await Participante.listarAtivos();

    const total = participantes.length;
    const presentes = participantes.filter(p => p.presente).length;
    const ausentes = total - presentes;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", "attachment; filename=relatorio_participantes.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(18).text("📊 Relatório Geral de Participantes - FatecWeek", { align: "center" });
    doc.moveDown();

    // Estatísticas
    doc.fontSize(12).text(`Total de Participantes: ${total}`);
    doc.text(`Presentes: ${presentes}`);
    doc.text(`Ausentes: ${ausentes}`);
    doc.moveDown();

    // Lista detalhada
    participantes.forEach((p, i) => {
      doc.fontSize(10).text(
        `${i + 1}. RA: ${p.ra} | Nome: ${p.nome} | Curso: ${p.curso} | Status: ${p.presente ? "Presente" : "Ausente"} | Tempo: ${formatarTempo(p.tempo_total_minutos)}`
      );
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

/**
 * Relatório filtrado por curso em PDF
 */
async function gerarRelatorioCursoPDF(req, res) {
  try {
    const curso = req.params.curso;
    const participantes = await Participante.buscarPorCurso(curso);

    if (!participantes || participantes.length === 0) {
      return res.status(404).json({ sucesso: false, erro: "Nenhum participante encontrado para este curso." });
    }

    const total = participantes.length;
    const presentes = participantes.filter(p => p.presente).length;
    const ausentes = total - presentes;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", `attachment; filename=relatorio_${curso}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(18).text(`📊 Relatório de Participantes - ${curso}`, { align: "center" });
    doc.moveDown();

    // Estatísticas
    doc.fontSize(12).text(`Curso: ${curso}`);
    doc.text(`Total de Participantes: ${total}`);
    doc.text(`Presentes: ${presentes}`);
    doc.text(`Ausentes: ${ausentes}`);
    doc.moveDown();

    // Lista detalhada
    participantes.forEach((p, i) => {
      doc.fontSize(10).text(
        `${i + 1}. RA: ${p.ra} | Nome: ${p.nome} | Status: ${p.presente ? "Presente" : "Ausente"} | Tempo: ${formatarTempo(p.tempo_total_minutos)}`
      );
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

module.exports = { gerarRelatorioParticipantesPDF, gerarRelatorioCursoPDF };
