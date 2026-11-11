import { GameProgressStatus } from '../../entity/member-game-progress.entity';
import { GameStepLayout } from '../../entity/game-step.entity';

export interface MemberGameLevelItem {
  id: number;
  levelNumber: number;
  title: string;
  targetDescription: string | null;
  totalMissions: number;
  completedMissions: number;
  isUnlocked: boolean;
}

export interface MemberGameItem {
  id: number;
  levelId: number;
  levelNumber: number;
  key: string;
  name: string;
  orderIndex: number;
  pointsReward: number;
  haveNextLevel: boolean;
  status: GameProgressStatus;
  completedAt: Date | null;
}

export interface MemberGameStepItem {
  id: number;
  stepOrder: number;
  layout: GameStepLayout;
  title: string;
  description: string;
  descriptionExtra: string | null;
  instruction: string | null;
  videoUrl: string | null;
  reflectiveTitle: string | null;
  reflectiveQuestion: string | null;
}

export interface MemberGameDetailResponse {
  id: number;
  key: string;
  name: string;
  levelId: number;
  levelNumber: number;
  orderIndex: number;
  successMessage: string | null;
  haveNextLevel: boolean;
  pointsReward: number;
  status: GameProgressStatus;
  steps: MemberGameStepItem[];
}

export interface MemberGameSubmitResponse {
  success: boolean;
  earnedPoints: number;
  haveNextLevel: boolean;
  successMessage: string;
  nextMissionKey: string | null;
}

export interface MemberGameOverviewResponse {
  currentLevel: number;
  totalPoints: number;
  rank: number;
}

export interface MemberLeaderboardItem {
  rank: number;
  memberId: number;
  name: string;
  points: number;
  avatarUrl: string | null;
  isOwner: boolean;
}

export interface MemberLeaderboardResponse {
  topPlayer: MemberLeaderboardItem | null;
  leaderboard: MemberLeaderboardItem[];
  myStats: {
    rank: number;
    points: number;
    currentLevel: number;
  };
}


