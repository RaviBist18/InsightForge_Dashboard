export default function Loading() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      <div className="h-20 bg-white/5 rounded-2xl w-1/3" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl" />
        ))}
      </div>
      
      <div className="h-12 bg-white/5 rounded-xl w-full" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-white/5 rounded-2xl" />
        <div className="h-[400px] bg-white/5 rounded-2xl" />
      </div>
      
      <div className="h-[300px] bg-white/5 rounded-2xl w-full" />
    </div>
  );
}
