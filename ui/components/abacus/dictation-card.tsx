import { Card } from "@/components/card";
import { Link } from "@/components/catalyst/link";
import { Badge } from "@/components/catalyst/badge";
import { Dictation } from "@/types/dictation";
import moment from "moment";

interface DictationCardProps {
  dictation: Dictation;
}

export function DictationCard({ dictation }: DictationCardProps) {
  return (
    <Link href={`/abacus/dictation/${dictation.id}`} className="block">
      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge color="blue">
              {dictation.digits} Digit{dictation.digits > 1 ? "s" : ""}
            </Badge>
            <Badge color="purple" className="capitalize">
              {dictation.speed}
            </Badge>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {dictation.numbers} numbers per question
          </p>

          <time className="text-xs text-zinc-500 dark:text-zinc-500">
            {moment(dictation.createdAt).format("MMM d, yyyy h:mm a")}
          </time>
        </div>
      </Card>
    </Link>
  );
}
