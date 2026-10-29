import type { GameState } from '../core/gameState';

export type IntroSceneKind = 'harbor' | 'storm' | 'drift' | 'beach' | 'island';
export type IntroSource = 'main' | 'backup' | 'none';

export interface IntroCard {
  title: string;
  body: string;
  scene: IntroSceneKind;
}

export const INTRO_STORY: IntroCard[] = [
  {
    title: '起航',
    body: '1659 年，英格兰赫尔港。你以鲁滨孙之名登上“希望号”，船上载着布匹与铁器，驶向西印度群岛。',
    scene: 'harbor',
  },
  {
    title: '风暴',
    body: '第 12 夜，加勒比海起了风暴。桅杆折断，货舱进水，船长吼着让人砍断主桅——浪已经把甲板掀成两半。',
    scene: 'storm',
  },
  {
    title: '漂流',
    body: '你抓住一只装工具的木箱，被浪打进黑水。三天里，你只看见雨、星光，和一只绕着你打转的海鸟。',
    scene: 'drift',
  },
  {
    title: '上岸',
    body: '第四天黎明，浪把你推上南岸。你咳出海水；木箱卡在礁石间，破船的龙骨半埋在远处的沙里。',
    scene: 'beach',
  },
  {
    title: '荒岛第一天',
    body: '岛上没有人烟，只有树影和潮声。你从箱里摸到火石和半截绳子——从今天起，先活下来，再想怎么回去。',
    scene: 'island',
  },
];

export function shouldPlayIntro(state: GameState, source: IntroSource): boolean {
  return source === 'none' && !state.flags.introSeen;
}

export function markIntroSeen(state: GameState): void {
  state.flags.introSeen = true;
}
