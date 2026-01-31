import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface SafeAreaValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export function SafeAreaDebug() {
  const location = useLocation();
  const [values, setValues] = useState<SafeAreaValues>({
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for debug query param
    const params = new URLSearchParams(location.search);
    setIsVisible(params.get('debugSafeArea') === '1');
  }, [location.search]);

  useEffect(() => {
    if (!isVisible) return;

    const updateValues = () => {
      const styles = getComputedStyle(document.documentElement);
      setValues({
        top: styles.getPropertyValue('--safe-top').trim() || '0px',
        right: styles.getPropertyValue('--safe-right').trim() || '0px',
        bottom: styles.getPropertyValue('--safe-bottom').trim() || '0px',
        left: styles.getPropertyValue('--safe-left').trim() || '0px',
      });
    };

    // Initial read
    updateValues();

    // Also read after a short delay in case CSS vars are set async
    const timer = setTimeout(updateValues, 500);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-safe left-0 z-[9999] bg-black/90 text-white text-xs p-2 rounded-br-lg font-mono"
      style={{ marginTop: '4px', marginLeft: '4px' }}
    >
      <div className="font-bold mb-1">Safe Areas:</div>
      <div>top: {values.top}</div>
      <div>right: {values.right}</div>
      <div>bottom: {values.bottom}</div>
      <div>left: {values.left}</div>
    </div>
  );
}
