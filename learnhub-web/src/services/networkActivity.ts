type NetworkActivityListener = () => void;

let pendingRequests = 0;
let progressSuppressions = 0;
const listeners = new Set<NetworkActivityListener>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const beginNetworkActivity = (): (() => void) => {
  pendingRequests += 1;
  emitChange();

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitChange();
  };
};

export const suppressNetworkProgress = (): (() => void) => {
  progressSuppressions += 1;
  emitChange();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    progressSuppressions = Math.max(0, progressSuppressions - 1);
    emitChange();
  };
};

export const subscribeToNetworkActivity = (listener: NetworkActivityListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const isNetworkActive = (): boolean => pendingRequests > 0;

export const isNetworkProgressActive = (): boolean =>
  pendingRequests > 0 && progressSuppressions === 0;
