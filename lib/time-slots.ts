import { addMinutes, format, parse, isBefore, isSameDay } from 'date-fns';
import { Appointment, BlockOut, TimeSlot, Staff } from '@/lib/types';
import { normalizeTime } from '@/lib/db';

interface GenerateSlotsParams {
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  appointments: Appointment[];
  blockOuts: BlockOut[];
  doctor?: Staff | null;
  clinicStartHour?: number; // default: 8 (08:00)
  clinicEndHour?: number;   // default: 17 (17:00)
  breakStartHour?: number;  // default: 12 (12:00)
  breakEndHour?: number;    // default: 13 (13:00)
}

const dayNamesIndonesian = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/**
 * Generates dynamic time slots for a doctor on a specific date using date-fns.
 * Accounts for doctor's practice days, practice hours, service duration, lunch breaks, active bookings, and block-outs.
 */
export function generateAvailableSlots({
  date,
  durationMinutes,
  appointments,
  blockOuts,
  doctor,
  clinicStartHour = 8,
  clinicEndHour = 17,
  breakStartHour = 12,
  breakEndHour = 13,
}: GenerateSlotsParams): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());
  const now = new Date();
  const isToday = isSameDay(baseDate, now);

  // 1. Doctor's practice day check
  const dayIndex = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
  const dayName = dayNamesIndonesian[dayIndex];

  if (doctor && doctor.practice_days && doctor.practice_days.length > 0) {
    if (!doctor.practice_days.includes(dayName)) {
      // Doctor does not practice on this day
      return [];
    }
  }

  // 2. Doctor custom start/end hour or default clinic hours
  let startH = clinicStartHour;
  let startM = 0;
  let endH = clinicEndHour;
  let endM = 0;

  if (doctor?.practice_start_time) {
    const [h, m] = doctor.practice_start_time.split(':').map(Number);
    if (!isNaN(h)) startH = h;
    if (!isNaN(m)) startM = m;
  }

  if (doctor?.practice_end_time) {
    const [h, m] = doctor.practice_end_time.split(':').map(Number);
    if (!isNaN(h)) endH = h;
    if (!isNaN(m)) endM = m;
  }

  let currentTime = new Date(baseDate);
  currentTime.setHours(startH, startM, 0, 0);

  const endTime = new Date(baseDate);
  endTime.setHours(endH, endM, 0, 0);

  // Active appointments for this date
  const activeBookings = appointments.filter(
    (a) => a.appointment_date === date && a.status !== 'cancelled'
  );

  // Active block-outs for this date
  const dayBlockOuts = blockOuts.filter((b) => b.block_date === date);

  while (isBefore(currentTime, endTime)) {
    const slotStartStr = format(currentTime, 'HH:mm');
    const nextTime = addMinutes(currentTime, durationMinutes);

    // Stop if slot exceeds closing/practice hours
    if (isBefore(endTime, nextTime)) {
      break;
    }

    const slotEndStr = format(nextTime, 'HH:mm');
    const slotHour = currentTime.getHours();

    let isAvailable = true;
    let reasonUnavailable: TimeSlot['reasonUnavailable'];

    // 1. Lunch Break Check (12:00 - 13:00)
    if (slotHour >= breakStartHour && slotHour < breakEndHour) {
      isAvailable = false;
      reasonUnavailable = 'break';
    }

    // 2. Past time check if selected date is today
    if (isAvailable && isToday && isBefore(currentTime, now)) {
      isAvailable = false;
      reasonUnavailable = 'past';
    }

    // 3. Existing Booking Collision Check
    if (isAvailable) {
      const isBooked = activeBookings.some((booking) => {
        const bStart = normalizeTime(booking.start_time);
        const bEnd = normalizeTime(booking.end_time);
        return slotStartStr < bEnd && slotEndStr > bStart;
      });

      if (isBooked) {
        isAvailable = false;
        reasonUnavailable = 'booked';
      }
    }

    // 4. Block-out Check (Leave / Cito Surgery / Meeting)
    if (isAvailable) {
      const isBlocked = dayBlockOuts.some((block) => {
        const blStart = normalizeTime(block.start_time);
        const blEnd = normalizeTime(block.end_time);
        return slotStartStr < blEnd && slotEndStr > blStart;
      });

      if (isBlocked) {
        isAvailable = false;
        reasonUnavailable = 'blocked';
      }
    }

    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      isAvailable,
      reasonUnavailable,
    });

    currentTime = nextTime;
  }

  return slots;
}
