import React from 'react';
import { GameStatEntry } from '../../types';
import { AddGameStatsModal, AddGameStatsModalProps } from './AddGameStatsModal';

export type SubmitGameStatsModalProps = AddGameStatsModalProps;

export const SubmitGameStatsModal: React.FC<SubmitGameStatsModalProps> = (props) => {
  return <AddGameStatsModal {...props} />;
};

export { AddGameStatsModal };
