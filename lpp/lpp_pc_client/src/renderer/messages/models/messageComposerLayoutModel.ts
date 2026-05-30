const composerHeightBounds = {
  min: 190,
  max: 360,
  minMessageStage: 160,
  maxPanelRatio: 0.46,
};

export function clampComposerHeight(height: number, panelHeight?: number | null) {
  const roundedHeight = Math.round(height);
  if (!panelHeight || panelHeight <= 0) {
    return Math.min(
      composerHeightBounds.max,
      Math.max(composerHeightBounds.min, roundedHeight),
    );
  }

  const headerHeight = 72;
  const availableBelowHeader = Math.max(0, panelHeight - headerHeight);
  const dynamicMax = Math.min(
    composerHeightBounds.max,
    Math.floor(panelHeight * composerHeightBounds.maxPanelRatio),
    Math.max(
      composerHeightBounds.min,
      availableBelowHeader - composerHeightBounds.minMessageStage,
    ),
  );
  const maxHeight = Math.max(composerHeightBounds.min, dynamicMax);
  return Math.min(maxHeight, Math.max(composerHeightBounds.min, roundedHeight));
}
