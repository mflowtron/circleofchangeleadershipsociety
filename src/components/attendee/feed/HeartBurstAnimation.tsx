export function HeartBurstAnimation() {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <span className="text-[80px] heart-burst">❤️</span>
      </div>
      <style>{`
        @keyframes heartBurst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
          30% {
            transform: translate(-50%, -50%) scale(0.95);
          }
          45% {
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -60%) scale(1.2);
          }
        }
        .heart-burst {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: heartBurst 0.8s ease-out forwards;
        }
      `}</style>
    </>
  );
}
