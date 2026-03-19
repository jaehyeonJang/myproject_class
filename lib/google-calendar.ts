export async function getCalendarEvents(date: string, accessToken: string): Promise<string[]> {
  if (!accessToken) return [];

  const startDate = new Date(`${date}T00:00:00`);
  const endDate = new Date(`${date}T23:59:59`);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startDate.toISOString());
  url.searchParams.set("timeMax", endDate.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((item: { summary?: string; start?: { dateTime?: string; date?: string } }) => {
    const time = item.start?.dateTime
      ? new Date(item.start.dateTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : "";
    return time ? `${item.summary ?? "(무제)"} ${time}` : (item.summary ?? "(무제)");
  });
}
