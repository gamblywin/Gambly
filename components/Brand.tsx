'use client';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand compact' : 'brand'}>
      {compact ? (
        <img src="/assets/gambly-mark.png" alt="GAMBLY" className="brand-mark-img" />
      ) : (
        <>
          <img
            src="/assets/gambly-wordmark.png"
            alt="GAMBLY"
            className="brand-wordmark brand-wordmark-dark"
          />
          <img
            src="/assets/gambly-wordmark-light.png"
            alt="GAMBLY"
            className="brand-wordmark brand-wordmark-light"
          />
        </>
      )}
    </div>
  );
}
