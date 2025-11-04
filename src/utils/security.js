// Função para configurar SSL/TLS de acordo com o ambiente
function configureSecurity() {
    if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Ambiente de desenvolvimento detectado:');
        console.warn('   - Certificados SSL auto-assinados permitidos');
        console.warn('   - Use apenas para desenvolvimento local!');
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    } else {
        // Produção: Exige certificados válidos
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
}

module.exports = { configureSecurity };