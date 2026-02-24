"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MirrorForm } from "../mirror-form";

export default function MirrorCreatePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container w-full max-w-[42rem]">
        <div className="bg-background/25 backdrop-blur-md p-6 sm:p-8 space-y-8">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <h1 className="text-2xl font-semibold">Mirror</h1>
            <p className="text-muted-foreground text-sm">
              State your intent in three fields. Share the feedback link after
              your all-hands, update, or conversation. See how your message
              actually landed.
            </p>
          </div>

          <MirrorForm />
        </div>
      </div>
    </main>
  );
}
