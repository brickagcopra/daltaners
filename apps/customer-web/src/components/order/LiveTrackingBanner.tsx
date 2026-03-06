interface LiveTrackingBannerProps {
  isConnected: boolean;
}

export function LiveTrackingBanner({ isConnected }: LiveTrackingBannerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
      <span className="relative flex h-2.5 w-2.5">
        {isConnected ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </>
        ) : (
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-500" />
        )}
      </span>
      <span className="text-sm font-medium text-green-800">
        {isConnected ? 'Live Tracking' : 'Reconnecting...'}
      </span>
    </div>
  );
}
