import { Link } from "react-router-dom";

type PlaceholderProps = {
  title: string;
  description: string;
};

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-[0.24em] text-amber-600">
          RAITO
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-slate-600">{description}</p>
      </header>

      <Link
        className="w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
        to="/"
      >
        返回首頁
      </Link>
    </main>
  );
}
