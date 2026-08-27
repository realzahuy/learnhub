type PanelPlacement = 'top' | 'bottom' | 'left' | 'right';

interface ChatbotPanelLayoutInput {
  buttonLeft: number;
  buttonTop: number;
  buttonWidth: number;
  buttonHeight: number;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ChatbotPanelLayout {
  placement: PanelPlacement;
  offsetX: number;
  offsetY: number;
}

export function calculateChatbotPanelLayout({
  buttonLeft,
  buttonTop,
  buttonWidth,
  buttonHeight,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
}: ChatbotPanelLayoutInput): ChatbotPanelLayout {
  const gap = viewportWidth <= 576 ? 62 : 66;
  const leftSpace = buttonLeft - gap;
  const rightSpace = viewportWidth - buttonLeft - buttonWidth - gap;
  const topSpace = buttonTop - gap;
  const bottomSpace = viewportHeight - buttonTop - buttonHeight - gap;
  const canShowLeft = leftSpace >= panelWidth;
  const canShowRight = rightSpace >= panelWidth;
  const canShowTop = topSpace >= panelHeight;
  const canShowBottom = bottomSpace >= panelHeight;
  const preferredPanelSide: PanelPlacement = buttonLeft + buttonWidth / 2 < viewportWidth / 2
    ? 'right'
    : 'left';

  let placement: PanelPlacement;
  if (!canShowTop && canShowBottom) placement = 'bottom';
  else if (!canShowBottom && canShowTop) placement = 'top';
  else if (preferredPanelSide === 'right' && canShowRight) placement = 'right';
  else if (preferredPanelSide === 'left' && canShowLeft) placement = 'left';
  else if (canShowRight) placement = 'right';
  else if (canShowLeft) placement = 'left';
  else if (canShowBottom) placement = 'bottom';
  else placement = 'top';

  const viewportPadding = 8;
  let offsetX = 0;
  let offsetY = 0;

  if (placement === 'top' || placement === 'bottom') {
    const desiredPanelLeft = buttonLeft + buttonWidth / 2 - panelWidth / 2;
    const maxPanelLeft = Math.max(viewportPadding, viewportWidth - panelWidth - viewportPadding);
    const clampedPanelLeft = Math.min(
      Math.max(desiredPanelLeft, viewportPadding),
      maxPanelLeft
    );
    offsetX = clampedPanelLeft - buttonLeft;
  }

  if (placement === 'left' || placement === 'right') {
    const desiredPanelTop = buttonTop + buttonHeight / 2 - panelHeight / 2;
    const maxPanelTop = Math.max(viewportPadding, viewportHeight - panelHeight - viewportPadding);
    const clampedPanelTop = Math.min(
      Math.max(desiredPanelTop, viewportPadding),
      maxPanelTop
    );
    offsetY = clampedPanelTop - buttonTop;
  }

  return { placement, offsetX, offsetY };
}
