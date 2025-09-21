// src/routes/relatorios.js
const express = require("express");
const PDFDocument = require("pdfkit");
const Participante = require("../models/Participante");

const router = express.Router();

// Função auxiliar para formatar tempo
function formatarTempo(minutos) {
  if (!minutos || minutos === 0) return "0min";
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
}

// Definir mínimo de minutos para aptidão (15 horas = 900 minutos)
const minimoCertificado = 900;

/**
 * GET /relatorios/curso-semestre-detalhado
 * Gera PDF com lista de participantes por curso/semestre
 */
router.get("/curso-semestre-detalhado", async (req, res) => {
  try {
    const { curso, semestre } = req.query;

    if (!curso || !semestre) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe curso e semestre, ex: /relatorios/curso-semestre-detalhado?curso=Redes de Computadores&semestre=2º Semestre"
      });
    }

    const participantes = await Participante.find({ curso, semestre, ativo: true }).sort({ nome: 1 });
    if (participantes.length === 0) {
      return res.status(404).json({ sucesso: false, erro: "Nenhum participante encontrado para esse curso/semestre." });
    }

    const doc = new PDFDocument({ margin: 30, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=relatorio_${curso}_${semestre}.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text("📑 Relatório Detalhado de Participantes", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Curso: ${curso}`);
    doc.text(`Semestre: ${semestre}`);
    doc.text(`Total de Participantes: ${participantes.length}`);
    doc.text(`Tempo mínimo para certificado: ${formatarTempo(minimoCertificado)}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text(
      "RA".padEnd(15) + "Nome".padEnd(30) + "Email".padEnd(35) + "Tempo".padEnd(15) + "Status",
      { underline: true }
    );
    doc.moveDown(0.5);
    doc.font("Helvetica");

    participantes.forEach(p => {
      const tempo = formatarTempo(p.tempo_total_minutos || 0);
      const apto = (p.tempo_total_minutos || 0) >= minimoCertificado ? "✅ Apto" : "❌ Não apto";

      const linha =
        (p.ra || "-").padEnd(15) +
        (p.nome || "-").padEnd(30) +
        (p.email || "-").padEnd(35) +
        tempo.padEnd(15) +
        apto;

      doc.text(linha);
    });

    doc.moveDown(2);
    doc.fontSize(10).text("Relatório gerado automaticamente pelo sistema FatecWeek.", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

/**
 * GET /api/relatorios/curso-semestre-detalhado
 * Retorna JSON com lista de participantes por curso/semestre
 */
router.get("/api/curso-semestre-detalhado", async (req, res) => {
  try {
    const { curso, semestre } = req.query;

    if (!curso || !semestre) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe curso e semestre, ex: /api/relatorios/curso-semestre-detalhado?curso=Redes de Computadores&semestre=2º Semestre"
      });
    }

    const participantes = await Participante.find({ curso, semestre, ativo: true }).sort({ nome: 1 });

    if (participantes.length === 0) {
      return res.status(404).json({ sucesso: false, erro: "Nenhum participante encontrado para esse curso/semestre." });
    }

    const dados = participantes.map(p => ({
      ra: p.ra,
      nome: p.nome,
      email: p.email,
      curso: p.curso,
      semestre: p.semestre,
      tempo_total: formatarTempo(p.tempo_total_minutos || 0),
      apto: (p.tempo_total_minutos || 0) >= minimoCertificado
    }));

    res.json({
      sucesso: true,
      curso,
      semestre,
      total: dados.length,
      minimo_certificado: formatarTempo(minimoCertificado),
      participantes: dados
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

module.exports = router;
