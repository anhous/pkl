'use strict';

// Pengirim email reset password. Butuh SMTP_* di .env.
// Kalau SMTP_HOST kosong -> email dilewati, link reset dicatat ke log server
// (dipakai untuk testing via IP lokal sebelum SMTP sekolah siap).
async function sendPasswordResetEmail({ to, resetUrl, expiresMinutes }) {
  const host = process.env.SMTP_HOST || '';
  if (!host) {
    // eslint-disable-next-line no-console
    console.log(`[mailer] SMTP belum dikonfigurasi. Link reset untuk ${to} (kedaluwarsa ${expiresMinutes} mnt): ${resetUrl}`);
    return { sent: false, reason: 'smtp-not-configured' };
  }
  // Lazy require agar app tetap jalan walau nodemailer belum terinstal di env lama.
  const nodemailer = require('nodemailer');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sekolah.id';
  await transporter.sendMail({
    from,
    to,
    subject: 'Reset password Jurnal Digital PKL',
    text: `Seseorang meminta reset password akun ${to}.\n\nKlik link berikut (berlaku ${expiresMinutes} menit, sekali pakai):\n${resetUrl}\n\nAbaikan email ini jika Anda tidak memintanya.`,
    html: `<p>Seseorang meminta reset password akun <b>${to}</b>.</p><p><a href="${resetUrl}">Klik di sini untuk membuat password baru</a> (berlaku ${expiresMinutes} menit, sekali pakai).</p><p>Abaikan email ini jika Anda tidak memintanya.</p>`,
  });
  return { sent: true };
}

module.exports = { sendPasswordResetEmail };
