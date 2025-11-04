// src/utils/EmailAdapter.js
// Padrão Estrutural - Adapter
// Fornece uma interface única para envio de emails e certificados, delegando para o serviço atual (utils/email)

// EmailAdapter: seleciona provider com base em EMAIL_PROVIDER
// providers suportados: 'smtp' (padrão, usa ./email.js), 'sendgrid' (API)

const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

if (provider === 'sendgrid') {
  // usa adapter específico para SendGrid (API)
  module.exports = require('./EmailAdapterSendGrid');
} else {
  // fallback para serviço SMTP existente
  const EmailService = require('./email');

  class SMTPAdapter {
    constructor(service) {
      this.service = service || EmailService;
    }

    async send(options) {
      return this.service.sendEmail(options);
    }

    async sendCertificate(to, subject, text, attachmentPath) {
      return this.service.sendCertificateEmail(to, subject, text, attachmentPath);
    }

    async testConnection() {
      if (typeof this.service.testConnection === 'function') {
        return this.service.testConnection();
      }
      return this.send({
        to: process.env.SMTP_USER,
        subject: 'Teste Adapter - Email',
        html: '<p>Teste via EmailAdapter (SMTP)</p>'
      });
    }
  }

  module.exports = new SMTPAdapter();
}
