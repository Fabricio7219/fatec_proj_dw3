const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: false
                }
            });

            await this.transporter.verify();
            console.log('✅ Serviço de email inicializado com sucesso');
            this.initialized = true;
        } catch (error) {
            console.error('❌ Erro ao inicializar serviço de email:', error);
            throw error;
        }
    }

    async sendEmail(options) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await this.transporter.sendMail({
                from: `"Sistema Fatec" <${process.env.EMAIL_FROM}>`,
                ...options
            });
            
            console.log('✅ Email enviado com sucesso:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Tentando novamente (${this.retryCount}/${this.maxRetries})...`);
                return this.sendEmail(options);
            }
            
            throw error;
        }
    }

    async sendCertificateEmail(to, subject, text, attachmentPath) {
        const emailOptions = {
            to,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2c3e50; text-align: center;">Certificado de Participação</h1>
                    <div style="color: #34495e; line-height: 1.6; margin: 20px 0;">
                        ${text}
                    </div>
                    <div style="color: #7f8c8d; font-size: 0.9em; text-align: center; margin-top: 30px;">
                        Este é um email automático. Por favor, não responda.
                    </div>
                </div>
            `
        };

        if (attachmentPath) {
            emailOptions.attachments = [{
                filename: 'certificado.pdf',
                path: attachmentPath,
                contentType: 'application/pdf'
            }];
        }

        return this.sendEmail(emailOptions);
    }

    async testConnection() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const result = await this.sendEmail({
                to: process.env.SMTP_USER,
                subject: 'Teste de Conexão - Sistema Fatec',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h1>Teste de Conexão SMTP</h1>
                        <p>Este é um email de teste para verificar a configuração SMTP do sistema.</p>
                        <p>Data/Hora: ${new Date().toLocaleString()}</p>
                    </div>
                `
            });

            return {
                success: true,
                messageId: result.messageId,
                details: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER
                }
            };
        }
    }
}

// Exporta uma única instância do serviço
module.exports = new EmailService();