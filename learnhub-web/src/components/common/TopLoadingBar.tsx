import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  isNetworkProgressActive,
  subscribeToNetworkActivity,
} from '../../services/networkActivity';
import './TopLoadingBar.css';

const COMPLETE_DURATION_MS = 180;
const SHOW_DELAY_MS = 90;

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
      }, SHOW_DELAY_MS);
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
    }, COMPLETE_DURATION_MS);

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
