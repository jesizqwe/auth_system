const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendActivationMail(to, link) {
        await this.transporter.sendMail({
            from: "aleksandrkirchuk@gmail.com",
            to: to,
            subject: "Активация аккаунта на " + process.env.API_URL || "localhost",
            text: "",
            html: `
                <div>
                    <h1>Для активации перейдите по ссылке</h1>
                    <a href="${link}">${link}</a>
                </div>
            `
        });
    }
}

module.exports = new MailService();