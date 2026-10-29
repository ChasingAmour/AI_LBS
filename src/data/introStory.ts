import type { GameState } from '../core/gameState';

export type IntroSceneKind =
  | 'york'
  | 'harbor'
  | 'escape'
  | 'storm'
  | 'wreck'
  | 'raft'
  | 'supplies'
  | 'date';
export type IntroSource = 'main' | 'backup' | 'none';

export interface IntroCard {
  title: string;
  body: string;
  scene: IntroSceneKind;
}

export const INTRO_STORY: IntroCard[] = [
  {
    title: '约克，1632',
    body: '你生于约克一个商人家庭。父亲要你学法律，安稳过一生；你却总盯着港口的桅杆，想去看海。',
    scene: 'york',
  },
  {
    title: '赫尔，1651',
    body: '你违背父命登上开往伦敦的船。第一次航行就遇风暴；后来船被摩尔海盗劫走，你成了奴隶。',
    scene: 'harbor',
  },
  {
    title: '逃脱',
    body: '两年后，你带着小仆人佐立划船逃走，被葡萄牙船长救起，在巴西买下一座种植园。',
    scene: 'escape',
  },
  {
    title: '再次出海，1659',
    body: '为给种植园补充劳力，你随船前往几内亚。飓风连着刮了十二天，船被推上沙洲。',
    scene: 'storm',
  },
  {
    title: '沉船',
    body: '巨浪打翻小艇，同伴一个个消失。你被冲上荒岛，成为全船唯一的幸存者。',
    scene: 'wreck',
  },
  {
    title: '回船',
    body: '第二天退潮，你游回搁浅的破船，用桅杆和木板扎成木筏，一趟趟把能用的东西运上岸。',
    scene: 'raft',
  },
  {
    title: '物资',
    body: '面包、火药、工具、帆布和斧头——你把破船拆到只剩龙骨，在岸边堆起第一座物资堆。',
    scene: 'supplies',
  },
  {
    title: '1659 年 9 月 30 日',
    body: '你在岸边插下木桩，刻下日期。从这天起，荒岛成了你的王国：先活下来，再想怎么回去。',
    scene: 'date',
  },
];

export function shouldPlayIntro(state: GameState, source: IntroSource): boolean {
  return source === 'none' && !state.flags.introSeen;
}

export function markIntroSeen(state: GameState): void {
  state.flags.introSeen = true;
}
