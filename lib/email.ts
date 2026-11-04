import { Resend } from 'resend';
import { Appointment } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendAppointmentEmail(appointment: Appointment) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const manageUrl = `${appUrl}/manage?token=${appointment.reschedule_token}`;
  
  const formattedDate = appointment.appointment_date 
    ? format(parseISO(appointment.appointment_date), 'EEEE, dd MMMM yyyy', { locale: id })
    : appointment.appointment_date;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBFBF9; color: #2D3748; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #5E8B7E; color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: -0.5px; }
        .badge { display: inline-block; background-color: #E29578; color: white; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; }
        .content { padding: 24px; }
        .queue-box { background-color: #F0F4F2; border: 2px dashed #5E8B7E; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
        .queue-num { font-size: 32px; font-weight: 800; color: #5E8B7E; margin: 4px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .info-table td { padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
        .label { color: #718096; width: 35%; }
        .value { font-weight: 600; color: #2D3748; }
        .btn-wrapper { text-align: center; margin: 28px 0 16px; }
        .btn { background-color: #E29578; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; }
        .note { font-size: 12px; color: #a0aec0; text-align: center; margin-top: 20px; line-height: 1.5; }
        .footer { background: #fafafa; padding: 16px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #f0f0f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>TempoCare Clinic</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">Konfirmasi Reservasi & Nomor Antrean Pasien</p>
          <div class="badge">Jadwal Terkonfirmasi</div>
        </div>

        <div class="content">
          <p>Halo <strong>${appointment.patient_name}</strong>,</p>
          <p>Janji temu medis Anda di TempoCare telah berhasil didaftarkan ke dalam sistem kami dengan detail sebagai berikut:</p>

          <div class="queue-box">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #4a5568;">Nomor Antrean Anda</div>
            <div class="queue-num">${appointment.queue_number || 'A-001'}</div>
            <div style="font-size: 12px; color: #718096;">Harap datang 15 menit sebelum waktu konsultasi</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="label">Dokter Pemeriksa</td>
              <td class="value">${appointment.staff?.full_name || 'Dokter Spesialis'}</td>
            </tr>
            <tr>
              <td class="label">Poliklinik / Layanan</td>
              <td class="value">${appointment.service?.name || 'Konsultasi Medis'}</td>
            </tr>
            <tr>
              <td class="label">Tanggal Kunjungan</td>
              <td class="value">${formattedDate}</td>
            </tr>
            <tr>
              <td class="label">Waktu Praktek</td>
              <td class="value">${appointment.start_time} - ${appointment.end_time} WIB</td>
            </tr>
            <tr>
              <td class="label">Keluhan Awal</td>
              <td class="value">${appointment.initial_complaint || '-'}</td>
            </tr>
          </table>

          <div class="btn-wrapper">
            <a href="${manageUrl}" class="btn">Kelola / Pindah Jadwal / Batalkan</a>
          </div>

          <p class="note">
            *Tautan di atas bersifat rahasia dan one-time use untuk Anda. Pindah jadwal (reschedule) dapat dilakukan mandiri paling lambat <strong>H-1 (24 jam)</strong> sebelum waktu konsultasi.
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} TempoCare Medical Center. Sistem Reservasi Otomatis 24/7.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!appointment.patient_email) {
    console.log(`[TempoCare Email] Pasien tidak menyertakan email (WhatsApp only): ${appointment.patient_whatsapp}`);
    return { success: true, simulated: true };
  }

  if (!resend) {
    console.log(`\n======================================================`);
    console.log(`[SIMULATED EMAIL - Resend API Key not set]`);
    console.log(`To: ${appointment.patient_email}`);
    console.log(`Subject: Konfirmasi Jadwal TempoCare - Antrean: ${appointment.queue_number}`);
    console.log(`Manage URL: ${manageUrl}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TempoCare <onboarding@resend.dev>';
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [appointment.patient_email],
      subject: `Konfirmasi Janji Temu [Antrean ${appointment.queue_number}] - TempoCare`,
      html: htmlContent,
    });

    if (error) {
      console.error('[Resend Error]', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[Resend Exception]', err);
    return { success: false, error: err.message };
  }
}

