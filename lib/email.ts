import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { Appointment } from './types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Membuat transporter Nodemailer jika kredensial SMTP atau Gmail dikonfigurasi di .env
 */
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Mengirimkan email konfirmasi registrasi & nomor antrean secara otomatis kepada pasien.
 * Format email dirancang simpel, bersih, dan sangat mudah dipahami oleh pengguna.
 */
export async function sendAppointmentEmail(appointment: Appointment) {
  if (!appointment.patient_email || !appointment.patient_email.trim()) {
    console.log(`[TempoCare Email] Pasien tidak menyertakan email (WhatsApp only): ${appointment.patient_whatsapp}`);
    return { success: true, simulated: true, reason: 'no_email' };
  }

  const recipientEmail = appointment.patient_email.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const manageUrl = `${appUrl}/manage?token=${appointment.reschedule_token}`;

  let formattedDate = appointment.appointment_date;
  try {
    if (appointment.appointment_date) {
      formattedDate = format(parseISO(appointment.appointment_date), 'EEEE, dd MMMM yyyy', { locale: id });
    }
  } catch {
    formattedDate = appointment.appointment_date;
  }

  const docName = appointment.staff?.full_name || 'Dokter Spesialis';
  const srvName = appointment.service?.name || 'Konsultasi Medis';
  const queueNo = appointment.queue_number || 'A-001';
  const timeSlot = `${appointment.start_time} - ${appointment.end_time} WIB`;
  const complaint = appointment.initial_complaint || '-';
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'TempoCare <notifications@tempocare.clinic>';
  const subject = `[TempoCare] Pendaftaran Berhasil • Nomor Antrean: ${queueNo}`;

  // ==========================================
  // 1. FORMAT EMAIL TEKS POLOS (Simple Plain Text)
  // ==========================================
  const textContent = `
==================================================
  TEMPOCARE CLINIC & HOSPITAL
  BUKTI PENDAFTARAN & NOMOR ANTREAN PASIEN
==================================================

Halo Sdr/i ${appointment.patient_name},

Pendaftaran janji temu berobat Anda di TempoCare telah berhasil terdaftar ke dalam sistem kami.

--------------------------------------------------
NOMOR ANTREAN ANDA: ${queueNo}
--------------------------------------------------
Harap datang 15 menit sebelum waktu konsultasi.

RINCIAN JADWAL BEROBAT:
• Tanggal Kunjungan : ${formattedDate}
• Jam Periksa       : ${timeSlot}
• Dokter Bertugas   : ${docName}
• Poliklinik        : ${srvName}
• Keluhan Awal      : ${complaint}

PETUNJUK KEDATANGAN:
1. Datang 15 menit sebelum jam pemeriksaan untuk verifikasi kehadiran.
2. Tunjukkan nomor antrean ini (${queueNo}) kepada petugas resepsionis.
3. Anda dapat memindahkan hari atau membatalkan secara mandiri (maksimal H-1 sebelum jadwal) melalui tautan berikut:
${manageUrl}

Terima kasih atas kepercayaan Anda bersama TempoCare.
Layanan Pelanggan: ${appUrl}
==================================================
`.trim();

  // ==========================================
  // 2. FORMAT EMAIL HTML (Simpel, Responsif, Elegan)
  // ==========================================
  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 32px 12px;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #134e4a 0%, #2e5b53 100%);
      color: #ffffff;
      padding: 28px 24px 24px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .header h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 20px;
      color: #334155;
    }
    .queue-card {
      background: #f0fdf4;
      border: 2px dashed #059669;
      border-radius: 14px;
      padding: 20px 16px;
      text-align: center;
      margin: 20px 0 24px;
    }
    .queue-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #047857;
      text-transform: uppercase;
    }
    .queue-number {
      font-size: 40px;
      font-weight: 900;
      color: #065f46;
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 1px;
      margin: 4px 0;
    }
    .queue-hint {
      font-size: 12px;
      color: #047857;
      font-weight: 600;
      margin-top: 4px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 12px 14px;
      font-size: 13px;
    }
    .info-label {
      width: 38%;
      color: #64748b;
      font-weight: 600;
    }
    .info-val {
      color: #0f172a;
      font-weight: 700;
    }
    .btn-container {
      text-align: center;
      margin: 26px 0 20px;
    }
    .btn-action {
      background-color: #0d9488;
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
    }
    .guide-box {
      background: #f8fafc;
      border-left: 3px solid #0d9488;
      border-radius: 0 8px 8px 0;
      padding: 14px 16px;
      margin: 24px 0 16px;
      font-size: 12px;
      line-height: 1.6;
      color: #475569;
    }
    .guide-box strong {
      color: #0f172a;
      display: block;
      margin-bottom: 4px;
    }
    .guide-box ul {
      margin: 4px 0 0;
      padding-left: 18px;
    }
    .guide-box li {
      margin-bottom: 4px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      
      <!-- HEADER -->
      <div class="header">
        <div class="logo-badge">TempoCare Healthcare</div>
        <h1>Pendaftaran Berhasil!</h1>
        <p>Jadwal periksa Anda telah terkonfirmasi</p>
      </div>

      <!-- KONTEN UTAMA -->
      <div class="content">
        <p class="greeting">
          Halo <strong>${appointment.patient_name}</strong>,<br>
          Terima kasih telah mendaftar di <strong>TempoCare</strong>. Janji temu berobat Anda telah terdaftar dengan rincian sebagai berikut:
        </p>

        <!-- KOTAK NOMOR ANTREAN (BESAR & JELAS) -->
        <div class="queue-card">
          <div class="queue-label">Nomor Antrean Anda</div>
          <div class="queue-number">${queueNo}</div>
          <div class="queue-hint">✓ Harap tiba 15 menit sebelum jam pemeriksaan</div>
        </div>

        <!-- TABEL DETAIL JADWAL -->
        <table class="info-table">
          <tr>
            <td class="info-label">📅 Hari, Tanggal</td>
            <td class="info-val">${formattedDate}</td>
          </tr>
          <tr>
            <td class="info-label">⏰ Jam Periksa</td>
            <td class="info-val">${timeSlot}</td>
          </tr>
          <tr>
            <td class="info-label">👨‍⚕️ Dokter Bertugas</td>
            <td class="info-val">${docName}</td>
          </tr>
          <tr>
            <td class="info-label">🏥 Poliklinik</td>
            <td class="info-val">${srvName}</td>
          </tr>
          <tr>
            <td class="info-label">📝 Keluhan Awal</td>
            <td class="info-val">${complaint}</td>
          </tr>
        </table>

        <!-- TOMBOL KELOLA / GANTI JADWAL -->
        <div class="btn-container">
          <a href="${manageUrl}" class="btn-action">
            📅 Buka Jadwal / Ganti Hari
          </a>
        </div>

        <!-- PETUNJUK RINGKAS & MUDAH -->
        <div class="guide-box">
          <strong>Petunjuk Kunjungan Faskes:</strong>
          <ul>
            <li>Tunjukkan email atau nomor antrean <strong>${queueNo}</strong> ke meja resepsionis saat tiba di klinik.</li>
            <li>Jika berhalangan hadir, Anda dapat <strong>ganti hari</strong> secara mandiri melalui tombol di atas (maksimal H-1).</li>
          </ul>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        TempoCare Clinic & Hospital &bull; Sistem Reservasi Pasien Otomatis 24 Jam<br>
        Email ini dikirim secara otomatis sebagai bukti registrasi resmi Anda.
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();

  // ==========================================
  // PENGIRIMAN: 1. RESEND (Jika ada RESEND_API_KEY)
  // ==========================================
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        text: textContent,
        html: htmlContent,
      });

      if (error) {
        console.error('[Resend Error]', error);
        return { success: false, error: error.message };
      }

      console.log(`[TempoCare Email] Email berhasil dikirim via Resend ke ${recipientEmail} (ID: ${data?.id})`);
      return { success: true, id: data?.id, provider: 'resend' };
    } catch (err: any) {
      console.error('[Resend Exception]', err);
    }
  }

  // ==========================================
  // PENGIRIMAN: 2. SMTP / NODEMAILER (Jika ada kredensial SMTP/Gmail)
  // ==========================================
  const smtpTransporter = createSmtpTransporter();
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: fromEmail,
        to: recipientEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[TempoCare Email] Email berhasil dikirim via SMTP/Gmail ke ${recipientEmail} (MsgID: ${info.messageId})`);
      return { success: true, id: info.messageId, provider: 'smtp' };
    } catch (err: any) {
      console.error('[SMTP Exception]', err);
    }
  }

  // ==========================================
  // PENGIRIMAN: 3. SIMULASI LOG LOKAL (Development / Demo)
  // ==========================================
  console.log(`\n======================================================`);
  console.log(`[EMAIL OTOMATIS TERKIRIM - SIMULASI DEVELOPMENT]`);
  console.log(`Kepada (Pasien): ${recipientEmail}`);
  console.log(`Subjek         : ${subject}`);
  console.log(`Nomor Antrean  : ${queueNo}`);
  console.log(`Dokter / Poli  : ${docName} (${srvName})`);
  console.log(`Tanggal / Jam  : ${formattedDate} (${timeSlot})`);
  console.log(`Tautan Jadwal  : ${manageUrl}`);
  console.log(`Status         : Sukses tercatat (Atur RESEND_API_KEY atau SMTP di .env untuk pengiriman nyata)`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true, provider: 'local_simulation' };
}


