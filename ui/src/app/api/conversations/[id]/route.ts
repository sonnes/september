import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const filePath = path.join(process.cwd(), "data", "conversation.json");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const conversation = JSON.parse(fileContents);

  if (conversation.id === params.id) {
    return NextResponse.json(conversation);
  } else {
    return NextResponse.json(
      { message: "Conversation not found" },
      { status: 404 }
    );
  }
}
