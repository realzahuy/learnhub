import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { uiConfig } from '../../config/uiConfig';
import {
  isNetworkProgressActive,
  subscribeToNetworkActivity,
} from '../../services/networkActivity';
import './TopLoadingBar.css';

const TopLoadingBar = () => {
  const active = useSyncExternalStore(
    subscribeToNetworkActivity,
    isNetworkProgressActive,
    () => false
  );
  const [visible, setVisible] = useState(active);
  const [completing, setCompleting] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }

    if (active) {
      setCompleting(false);
      if (visible) return;
      showTimer.current = window.setTimeout(() => {
        setVisible(true);
        showTimer.current = null;
      }, uiConfig.timing.topLoadingShowDelayMs);
      return () => {
        if (showTimer.current !== null) {
          window.clearTimeout(showTimer.current);
          showTimer.current = null;
        }
      };
    }

    if (!visible) return;
    setCompleting(true);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setCompleting(false);
      hideTimer.current = null;
    }, uiConfig.timing.topLoadingCompleteMs);

    return () => {
      if (hideTimer.current !== null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (showTimer.current !== null) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
    };
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      className={`top-loading-bar${completing ? ' is-completing' : ''}`}
      role="progressbar"
      aria-label="Đang tải nội dung"
    >
      <span />
    </div>
  );
};

export default TopLoadingBar;
