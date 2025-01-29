import { NextResponse } from "next/server";
import { createMessage, getMessages } from "@/db/messages";
import type { Message } from "@/db/messages";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "100");

  try {
    const messages = await getMessages(page, pageSize);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const message: Message = await request.json();
    message.createdAt = new Date();
    message.id = crypto.randomUUID();

    const createdMessage = await createMessage(message);
    return NextResponse.json(createdMessage);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
