import { TopNavigation } from "@/components/top-navigation";
import { cn } from "@/lib/utils";

const colorsMap = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  lime: "bg-lime-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  zinc: "bg-zinc-500",
};

export default function SingleColumnLayout({
  children,
  title,
  color = "red",
}: {
  children: React.ReactNode;
  title: string;
  color?: keyof typeof colorsMap;
}) {
  const colorClass = colorsMap[color];

  return (
    <>
      <div className="min-h-full">
        <div className={cn(colorClass, "pb-32")}>
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
            <div className="rounded-lg bg-white px-5 py-6 shadow-sm sm:px-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
