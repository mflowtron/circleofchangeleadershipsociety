export function FeedHeader() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
      style={{
        background: 'linear-gradient(to bottom, rgba(9,9,11,0.8) 0%, rgba(9,9,11,0.4) 50%, transparent 100%)',
        height: 'calc(env(safe-area-inset-top) + 24px)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    />
  );
}
