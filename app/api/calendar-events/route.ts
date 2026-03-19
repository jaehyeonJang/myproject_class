import { getCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";

  const events = await getCalendarEvents(date, accessToken);
  return Response.json({ events });
}
