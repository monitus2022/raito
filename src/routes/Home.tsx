import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getHealth } from "../lib/api";

const links = [
  { to: "/lesson/n5-u01-l01", label: "課程", note: "第一課預覽" },
  { to: "/review", label: "複習", note: "間隔重複佇列" },
  { to: "/progress", label: "進度", note: "覆蓋率與弱點" },
  { to: "/settings", label: "設定", note: "假名、語音、速度" }
];

export function Home() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false
  });

  const statusClass = health.isPending
    ? "bg-amber-100 text-amber-800"
    : health.isError
      ? "bg-rose-100 text-rose-800"
      : "bg-emerald-100 text-emerald-800";

  const statusLabel = health.isPending
    ? "檢查中"
    : health.isError
      ? "後端未連線"
      : "正常";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-[0.24em] text-amber-600">
          RAITO
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          日語學習
        </h1>
        <p className="text-slate-600">
          從零開始，六個月內以 JLPT N4 為目標。
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium text-slate-900">系統狀態</h2>
            <p className="text-sm text-slate-500">
              第一階段：腳手架與部署設定
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        {health.isError ? (
          <p className="mt-3 text-sm text-slate-500">
            本機僅啟動前端時，後端不會連線；請使用完整啟動指令。
          </p>
        ) : null}
      </section>

      <nav className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow"
          >
            <span className="block font-medium text-slate-900">
              {link.label}
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              {link.note}
            </span>
          </Link>
        ))}
      </nav>

      <footer className="mt-auto text-sm text-slate-500">
        <Link className="underline underline-offset-4" to="/about">
          來源與授權
        </Link>
      </footer>
    </main>
  );
}
