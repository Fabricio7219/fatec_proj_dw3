// src/utils/presencaStrategies.js
// Padrão Comportamental - Strategy
// Implementa duas estratégias simples para validação de presença: GPS (perímetro) e QR

const { verificarPerimetro } = require('./location');

async function gpsStrategy({ localizacao, palestra }) {
  // localizacao: { lat, lng }
  if (!localizacao || !palestra || !palestra.localizacao) return { ok: false, motivo: 'Dados insuficientes para GPS' };
  const dentro = verificarPerimetro(localizacao, palestra.localizacao);
  return { ok: !!dentro, motivo: dentro ? null : 'Fora do perímetro' };
}

async function qrStrategy({ qrData, palestra, localizacao }) {
  // qrData pode ser uma string com o conteúdo lido do QR
  if (!qrData || !palestra) return { ok: false, motivo: 'Dados insuficientes para QR' };

  // Validação de Localização (Anti-Fraude)
  // Se a palestra tem localização definida, exigimos que o usuário esteja perto, mesmo usando QR
  if (palestra.localizacao && (palestra.localizacao.lat || palestra.localizacao.lng)) {
      if (!localizacao || !localizacao.lat) {
          return { ok: false, motivo: 'Localização é obrigatória para validar o QR Code (Anti-Fraude)' };
      }
      const dentro = verificarPerimetro(localizacao, palestra.localizacao);
      if (!dentro) {
          return { ok: false, motivo: 'QR Code válido, mas você está fora do local do evento.' };
      }
  }

  // Implementação simples: se o qrData contém o id da palestra ou o JSON com palestraId
  try {
    if (typeof qrData === 'string' && qrData.includes(palestra._id.toString())) {
      return { ok: true };
    }

    // Se veio como dataURL contendo JSON (como usamos ao gerar QR), tentar extrair
    try {
      const possible = qrData.startsWith('data:') ? qrData : qrData;
      // tentar parse JSON simples
      const parsed = JSON.parse(qrData);
      if (parsed && (parsed.palestraId === palestra._id.toString() || parsed.palestraId === palestra._id)) {
        return { ok: true };
      }
    } catch (e) {
      // ignore
    }

    // último recurso: comparar qrData com palestra.qr_code (quando salvo como dataURL)
    if (palestra.qr_code && typeof palestra.qr_code === 'string' && qrData === palestra.qr_code) {
      return { ok: true };
    }

    return { ok: false, motivo: 'QR inválido' };
  } catch (err) {
    return { ok: false, motivo: 'Erro na validação QR' };
  }
}

module.exports = {
  gpsStrategy,
  qrStrategy
};
