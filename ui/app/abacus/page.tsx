import SingleColumnLayout from "@/layouts/single-column";

export const metadata = {
  title: "Abacus",
};

export default function AbacusPage() {
  return (
    <SingleColumnLayout title={metadata.title}>
      <div>
        <p className="mt-4 text-gray-600">Welcome to the Abacus section.</p>
      </div>
    </SingleColumnLayout>
  );
}
