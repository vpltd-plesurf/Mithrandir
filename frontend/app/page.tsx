import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const res = await fetch("http://localhost:8000/api/library/stats", {
      cache: "no-store",
    });
    if (res.ok) {
      const stats = await res.json();
      if (stats.books_ready > 0) {
        redirect("/ask");
      }
    }
  } catch {
    // Backend not available, show library
  }
  redirect("/library");
}
