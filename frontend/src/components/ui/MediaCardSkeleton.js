/*
  MediaCardSkeleton

  Purpose:
  - Lightweight skeleton loader for grids of media cards used during async loads.

  Contract:
  - Props: { count?: number } — number of skeleton cards to render (default: 8)

  Notes:
  - Uses `animate-pulse` and tokenized background colors so it responds to theme.
*/
export default function MediaCardSkeleton({ count = 8 }) {
  const cards = Array.from({ length: count });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((_, i) => (
        <div key={i} className="bg-surface rounded-lg shadow overflow-hidden animate-pulse">
          <div className="aspect-square bg-surface-warm" />
          <div className="p-3">
            <div className="h-4 bg-surface-warm rounded w-3/4 mb-2" />
            <div className="h-3 bg-surface-warm rounded w-1/2" />
            <div className="flex gap-2 mt-3">
              <div className="h-6 bg-surface-warm rounded flex-1" />
              <div className="h-6 bg-surface-warm rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
