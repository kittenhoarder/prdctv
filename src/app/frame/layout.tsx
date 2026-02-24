import { JourneyInfoButton } from "@/components/journey-info-button";

/** Frame journey: background is rendered by JourneyBackground in root layout. */
export default function FrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10">
      <JourneyInfoButton
        label="What is Frame?"
        title="What is Frame"
        description="Frame helps you define your meeting or presentation before it starts. You answer a few prompts, then get a concise brief to align everyone on the goal, constraint, and expected outcome."
      />
      {children}
    </div>
  );
}
