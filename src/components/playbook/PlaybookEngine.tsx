import React from 'react';
import PlaybookLab, { PlaybookLabProps } from '../PlaybookLab';

export { TacticalCanvas } from './TacticalCanvas';
export { RouteLibraryModal, CORE_CONCEPTS_LIBRARY, TACTILE_ROUTES_LIBRARY } from './RouteLibraryModal';
export { AIAssistantModal } from './AIAssistantModal';
export { LiveDispatcherModal } from './LiveDispatcherModal';
export { WristHUDClient } from './WristHUDClient';

export interface PlaybookEngineProps extends PlaybookLabProps {}

export const PlaybookEngine: React.FC<PlaybookEngineProps> = (props) => {
  return <PlaybookLab {...props} />;
};

export default PlaybookEngine;
