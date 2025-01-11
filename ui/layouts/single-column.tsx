import { TopNavigation } from "@/components/top-navigation";

export default function SingleColumnLayout({
  children,
  title,
  color = "red",
}: {
  children: React.ReactNode;
  title: string;
  color?:
    | "indigo"
    | "blue"
    | "green"
    | "yellow"
    | "purple"
    | "pink"
    | "red"
    | "amber"
    | "lime"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky"
    | "violet"
    | "fuchsia"
    | "pink"
    | "rose";
}) {
  return (
    <>
      <div className="min-h-full">
        <div className={`bg-${color}-600 pb-32`}>
          <TopNavigation color={color} />
          <header className="py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {title}
              </h1>
            </div>
          </header>
        </div>

        <main className="-mt-32">
          <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
