/**
 * Generate ICS (iCalendar) file content for an event
 */
export function generateICSContent(event: {
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  meetingLink?: string | null;
}): string {
  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Default to 1 hour if no end time specified
  const endDate = event.endsAt || new Date(event.startsAt.getTime() + 60 * 60 * 1000);

  // Build description with meeting link appended
  let description = event.description || '';
  if (event.meetingLink) {
    description += description ? '\\n\\n' : '';
    description += `Join Meeting: ${event.meetingLink}`;
  }

  // Escape special characters in ICS format
  const escapeICS = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Circle of Change//LMS Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startsAt)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
  }

  if (event.meetingLink) {
    lines.push(`URL:${event.meetingLink}`);
  }

  lines.push(
    `UID:${crypto.randomUUID()}@coclc.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Download an ICS file with the given content
 */
export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9]/gi, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
