export default function TripDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-80 bg-slate-200" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="h-10 bg-slate-200 rounded w-1/2" />
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
