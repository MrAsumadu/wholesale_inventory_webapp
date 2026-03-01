export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
      <div className="skeleton h-5 w-16 mb-6" />
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="skeleton h-9 w-48 mb-2" />
          <div className="skeleton h-5 w-32" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-20" />
          <div className="skeleton h-9 w-24" />
        </div>
      </div>
      <div className="skeleton h-[120px] rounded-lg mb-8" />
      <div className="skeleton h-px w-full mb-6" />
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-7 w-20" />
        <div className="skeleton h-10 w-28" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-lg mb-2" />
      ))}
    </div>
  );
}
