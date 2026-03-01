import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:8000";

export default async function Home() {
  let booksReady = false;
  try {
    const res = await fetch(`${BACKEND_URL}/api/library/stats`, {
      cache: "no-store",
    });
    if (res.ok) {
      const stats = await res.json();
      booksReady = stats.books_ready > 0;
    }
  } catch {
    // Backend not available, default to library
  }
  redirect(booksReady ? "/ask" : "/library");
}
