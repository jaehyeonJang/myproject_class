import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, events, accessToken } = body as {
      date: string;
      events?: string[];
      accessToken?: string;
    };

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    // If events are not provided, try to fetch from calendar-events
    let calendarEvents: string[] = events ?? [];
    let noCalendarEvents = false;

    if (!events && accessToken) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        const calendarRes = await fetch(
          `${baseUrl}/api/calendar-events?date=${date}&accessToken=${encodeURIComponent(accessToken)}`
        );
        if (calendarRes.ok) {
          const calendarData = await calendarRes.json();
          calendarEvents = calendarData.events ?? [];
        }
      } catch {
        calendarEvents = [];
      }
    }

    noCalendarEvents = calendarEvents.length === 0;

    const prompt = noCalendarEvents
      ? `오늘 날짜는 ${date}입니다. 캘린더에 일정이 없습니다. 오늘 하루를 돌아보는 일반적인 회고 일기 초안을 한국어로 200자 내외로 작성해 주세요.`
      : `오늘 날짜는 ${date}이고 다음 일정들이 있었습니다:\n${calendarEvents.join("\n")}\n\n이 일정들을 바탕으로 오늘 하루를 돌아보는 일기 초안을 한국어로 200자 내외로 작성해 주세요.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const draftContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    const response: {
      content: string;
      noCalendarEvents?: boolean;
    } = {
      content: draftContent,
    };

    if (noCalendarEvents) {
      response.noCalendarEvents = true;
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "AI 추천 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
