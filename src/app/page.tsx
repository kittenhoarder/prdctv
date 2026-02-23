"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Presentation } from "lucide-react";

type MeetingType = "small" | "presentation";

const options: Array<{
  value: MeetingType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "small",
    label: "Small Meeting",
    description:
      "A focused conversation with a clear decision or outcome. Creates a Frame Brief to share before the meeting.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "presentation",
    label: "Presentation",
    description:
      "A communication to a larger or mixed audience. Creates a Frame Brief plus a Mirror link to capture how your message landed.",
    icon: <Presentation className="h-5 w-5" />,
  },
];

export default function Home() {
  const router = useRouter();
  const [selected, setSelected] = useState<MeetingType>("small");

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="content-container w-full space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Frame + Mirror</h1>
          <p className="text-muted-foreground text-base max-w-lg">
            Frame your meeting before it starts. Mirror how your communication
            actually landed.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">
            What are you preparing for?
          </p>
          <RadioGroup
            value={selected}
            onValueChange={(v) => setSelected(v as MeetingType)}
            className="gap-3"
          >
            {options.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={opt.value}
                className="cursor-pointer"
              >
                <Card
                  className={`transition-colors ${
                    selected === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={opt.value}
                        id={opt.value}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-primary">{opt.icon}</span>
                          <span className="font-medium text-sm">
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.push(`/frame/create?type=${selected}`)}
        >
          Start framing
        </Button>
      </div>
    </main>
  );
}
