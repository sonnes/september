import { getDictation } from "@/db/dictations";
import { notFound } from "next/navigation";
import SingleColumnLayout from "@/layouts/single-column";
import { DictationPlayer } from "@/components/abacus/dictation-player";
import { QuestionCard } from "@/components/abacus/question-card";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DictationPage({ params }: PageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const dictation = await getDictation(id);

  if (!dictation) {
    notFound();
  }

  return (
    <SingleColumnLayout title={`${dictation.digits} Digit Dictation`}>
      <div className="space-y-6">
        <div className="grid gap-6 grid-cols-4 lg:grid-cols-8">
          {dictation.questions.map((question, index) => (
            <QuestionCard
              key={index}
              question={question}
              index={index}
              showAnswer={true}
            />
          ))}
        </div>
      </div>
    </SingleColumnLayout>
  );
}
