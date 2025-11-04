/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
 * @param {number} lat1 Latitude do ponto 1
 * @param {number} lon1 Longitude do ponto 1
 * @param {number} lat2 Latitude do ponto 2
 * @param {number} lon2 Longitude do ponto 2
 * @returns {number} Distância em metros
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI/180; // φ, λ em radianos
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // em metros
}

/**
 * Verifica se uma localização está dentro do perímetro permitido
 * @param {Object} localizacaoUsuario Localização do usuário {lat, lng}
 * @param {Object} localizacaoPalestra Localização da palestra {lat, lng, raio_metros}
 * @returns {boolean} true se está dentro do perímetro
 */
function verificarPerimetro(localizacaoUsuario, localizacaoPalestra) {
    const distancia = calcularDistancia(
        localizacaoUsuario.lat,
        localizacaoUsuario.lng,
        localizacaoPalestra.lat,
        localizacaoPalestra.lng
    );
    
    return distancia <= localizacaoPalestra.raio_metros;
}

module.exports = {
    calcularDistancia,
    verificarPerimetro
};