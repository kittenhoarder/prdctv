import { JourneyInfoButton } from "@/components/journey-info-button";

/** Mirror journey: background is rendered by JourneyBackground in root layout. */
export default function MirrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10">
      <JourneyInfoButton
        label="What is Mirror?"
        title="What is Mirror"
        description="Mirror shows how your message was actually received. You share one anonymous response link with your audience, then compare their responses to your intended message and action."
      />
      {children}
    </div>
  );
}
