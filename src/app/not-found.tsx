import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="content-container text-center space-y-4">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          This link may have expired or never existed.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Start fresh</Link>
        </Button>
      </div>
    </main>
  );
}
