import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const accessToken = searchParams.get("accessToken");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ events: [] });
  }

  try {
    // Build time range for the given date (full day in UTC)
    const timeMin = new Date(`${date}T00:00:00.000Z`).toISOString();
    const timeMax = new Date(`${date}T23:59:59.999Z`).toISOString();

    const calendarUrl =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?timeMin=${encodeURIComponent(timeMin)}` +
      `&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true` +
      `&orderBy=startTime`;

    const calendarRes = await fetch(calendarUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!calendarRes.ok) {
      return NextResponse.json({ events: [] });
    }

    const calendarData = await calendarRes.json();
    const events: string[] = (calendarData.items ?? []).map(
      (item: { summary?: string; start?: { dateTime?: string; date?: string } }) => {
        const time = item.start?.dateTime
          ? new Date(item.start.dateTime).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        return time ? `${item.summary ?? "일정"} ${time}` : (item.summary ?? "일정");
      }
    );

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
