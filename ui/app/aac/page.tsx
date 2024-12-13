import SingleColumnLayout from "@/layouts/single-column";

export const metadata = {
  title: "AAC",
};

export default function AACPage() {
  return (
    <SingleColumnLayout title={metadata.title}>
      <div>
        <p className="mt-4 text-gray-600">
          Welcome to the AAC (Augmentative and Alternative Communication)
          section. This area provides tools and resources for alternative
          communication methods.
        </p>
      </div>
    </SingleColumnLayout>
  );
}
