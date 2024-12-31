import fs from "fs";
import path from "path";
import { Dictation } from "@/types/dictation";

const DATA_DIR = path.join(process.cwd(), "cache", "dictations");

// Ensure cache directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveDictation(dictation: Dictation): void {
  const filePath = path.join(DATA_DIR, `${dictation.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dictation, null, 2));
}

export function getDictation(id: string): Dictation | null {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as Dictation;
}

export function getAllDictations(): Dictation[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs.readdirSync(DATA_DIR);
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const content = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      return JSON.parse(content, (key, value) =>
        key === "createdAt" ? new Date(value) : value
      ) as Dictation;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}
