import React from 'react';
import { RouteNumber, RouteDepthLevel, ReadProgressionNumber, TacticalPlayer } from '../../types/tactics';
import { RouteTreeModal } from './RouteTreeModal';

interface RoutePickerModalProps {
  isOpen: boolean;
  player: TacticalPlayer | null;
  isFlipped?: boolean;
  onClose: () => void;
  onSelectRoute: (
    routeNumber: RouteNumber,
    depth?: RouteDepthLevel,
    readProgression?: ReadProgressionNumber | null,
    note?: string
  ) => void;
  onUpdateNote?: (note: string) => void;
  onClearRoute?: () => void;
}

export const RoutePickerModal: React.FC<RoutePickerModalProps> = ({
  isOpen,
  player,
  isFlipped = false,
  onClose,
  onSelectRoute,
  onClearRoute,
}) => {
  return (
    <RouteTreeModal
      isOpen={isOpen}
      player={player}
      isFlipped={isFlipped}
      onClose={onClose}
      onSelectRoute={(routeNum, depth, read, note) => {
        onSelectRoute(routeNum, depth, read, note);
      }}
      onClearRoute={onClearRoute}
    />
  );
};

export { RouteTreeModal };
export default RoutePickerModal;
