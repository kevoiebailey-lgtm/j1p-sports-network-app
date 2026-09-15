import React from 'react';
import { BottomNavDock, BottomNavDockProps } from '../Layout/BottomNavDock';

export interface FloatingDockProps extends BottomNavDockProps {}

/**
 * FloatingDock
 * Unified with BottomNavDock to enforce single root layout mounting,
 * preventing hydration mismatch and duplicate navigation docks.
 */
export const FloatingDock: React.FC<FloatingDockProps> = (props) => {
  return <BottomNavDock {...props} />;
};

export default FloatingDock;
