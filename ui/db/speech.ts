import { db } from "@/db";
import { SpeechFile, speechFiles } from "@/db/schema/speech";
import { eq } from "drizzle-orm";

export const createSpeechFile = async (speechFile: SpeechFile) => {
  await db.insert(speechFiles).values(speechFile);
};

export const getSpeechFile = async (id: string): Promise<SpeechFile | null> => {
  const result = await db
    .select()
    .from(speechFiles)
    .where(eq(speechFiles.id, id))
    .limit(1);

  return result[0] || null;
};
