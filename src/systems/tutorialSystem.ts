import type { GameState } from '../core/gameState';
import type { EventBus } from '../core/eventBus';
import { countItem } from './inventorySystem';

export interface TutorialGoal {
  id: string;
  label: string;
}

export const TUTORIAL_GOALS: TutorialGoal[] = [
  { id: 'chest', label: '打开破船上的箱子' },
  { id: 'stick', label: '制作一根木棍' },
  { id: 'campfire', label: '建造营火' },
  { id: 'workbench', label: '建造工作台' },
  { id: 'cage', label: '建造囚笼' },
  { id: 'friday', label: '准备迎接周五的野人' },
];

function goalDone(state: GameState, goal: TutorialGoal): boolean {
  switch (goal.id) {
    case 'chest':
      return state.world.uniqueLoot.includes('chest_wreck');
    case 'stick':
      return countItem(state, 'stick') > 0;
    case 'campfire':
      return state.buildings.some((b) => b.type === 'campfire');
    case 'workbench':
      return state.buildings.some((b) => b.type === 'workbench');
    case 'cage':
      return state.buildings.some((b) => b.type === 'cage');
    case 'friday':
      return state.time.day > 5 || state.flags.firstRaidDone;
    default:
      return false;
  }
}

export function currentGoal(state: GameState): TutorialGoal | null {
  return TUTORIAL_GOALS[state.flags.tutorialStep] ?? null;
}

export function refreshTutorial(state: GameState, bus?: EventBus): number {
  while (true) {
    const goal = currentGoal(state);
    if (!goal || !goalDone(state, goal)) break;
    state.flags.tutorialStep += 1;
    bus?.emit('tutorial:advanced', { step: state.flags.tutorialStep, goal: goal.id });
  }
  return state.flags.tutorialStep;
}
