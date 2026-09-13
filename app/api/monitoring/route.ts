import { NextRequest, NextResponse } from "next/server";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function POST(request: NextRequest) {
  if (!SENTRY_DSN) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const envelope = await request.text();
  const headerLine = envelope.split("\n")[0];

  if (!headerLine) {
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
  }

  let header: { dsn?: string };
  try {
    header = JSON.parse(headerLine);
  } catch {
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
  }

  if (header.dsn !== SENTRY_DSN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dsn = new URL(SENTRY_DSN);
  const projectId = dsn.pathname.replace(/^\//, "");
  const sentryUrl = `https://${dsn.host}/api/${projectId}/envelope/`;

  try {
    const upstream = await fetch(sentryUrl, {
      method: "POST",
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    });

    return new NextResponse(null, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
