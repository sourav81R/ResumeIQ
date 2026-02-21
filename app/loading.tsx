import LoadingPopup from "@/components/LoadingPopup";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,116,144,0.34),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(15,118,110,0.33),transparent_38%),rgba(15,23,42,0.42)] backdrop-blur-[3px]" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <LoadingPopup title="Loading page..." subtitle="Preparing the next view..." />
      </div>
    </div>
  );
}
