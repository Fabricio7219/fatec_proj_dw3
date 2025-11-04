// src/utils/EmailAdapterSendGrid.js
// Adapter para envio de email usando a biblioteca oficial @sendgrid/mail
// Requer variável de ambiente SENDGRID_API_KEY

const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail');

function ensureApiKey() {
  if (!process.env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY não configurada');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function send({ to, subject, html, attachments }) {
  ensureApiKey();

  const msg = {
    to,
    from: process.env.EMAIL_FROM || process.env.SENDGRID_FROM || 'no-reply@example.com',
    subject: subject || '',
    html: html || ''
  };

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    msg.attachments = [];
    for (const a of attachments) {
      if (a.path) {
        const data = fs.readFileSync(a.path);
        msg.attachments.push({
          content: data.toString('base64'),
          filename: a.filename || path.basename(a.path),
          type: a.contentType || 'application/octet-stream',
          disposition: 'attachment'
        });
      } else if (a.content) {
        msg.attachments.push({
          content: Buffer.from(a.content).toString('base64'),
          filename: a.filename || 'attachment',
          type: a.contentType || 'application/octet-stream',
          disposition: 'attachment'
        });
      }
    }
  }

  try {
    const resp = await sgMail.send(msg);
    return { success: true, response: resp };
  } catch (err) {
    // Normalizar erro para facilitar debug
    const message = err && err.response && err.response.body ? JSON.stringify(err.response.body) : err.message;
    throw new Error(`SendGrid error: ${message}`);
  }
}

async function sendCertificate(to, subject, text, attachmentPath) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2c3e50; text-align: center;">Certificado de Participação</h1>
      <div style="color: #34495e; line-height: 1.6; margin: 20px 0;">${text}</div>
      <div style="color: #7f8c8d; font-size: 0.9em; text-align: center; margin-top: 30px;">Este é um email automático. Por favor, não responda.</div>
    </div>
  `;

  const attachments = [];
  if (attachmentPath) attachments.push({ path: attachmentPath, filename: 'certificado.pdf', contentType: 'application/pdf' });

  return send({ to, subject, html, attachments });
}

async function testConnection() {
  try {
    ensureApiKey();
    const to = process.env.SENDGRID_TEST_TO || process.env.SMTP_USER || process.env.EMAIL_FROM;
    await send({ to, subject: 'Teste de Conexão - SendGrid Adapter', html: `<p>Teste de conexão: ${new Date().toLocaleString()}</p>` });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  send,
  sendCertificate,
  testConnection
};


