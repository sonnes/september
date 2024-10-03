import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "conversations.json");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const conversations = JSON.parse(fileContents);
  return NextResponse.json(conversations);
}
