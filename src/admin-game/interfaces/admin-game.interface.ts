import { GameStepLayout } from '../../entity/game-step.entity';
import { GameSubmissionAttachment } from '../../entity/member-game-submission.entity';

export interface AdminGameLevelItem {
  id: number;
  levelNumber: number;
  title: string;
  targetDescription: string | null;
  isActive: boolean;
  totalGames: number;
  publishedGames: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminGameStepItem {
  id?: number;
  stepOrder: number;
  layout: GameStepLayout;
  title: string;
  description: string;
  descriptionExtra: string | null;
  instruction: string | null;
  videoUrl: string | null;
  videoSource?: 'self' | 'youtube' | null;
  thumbnailUrl?: string | null;
  reflectiveTitle: string | null;
  reflectiveQuestion: string | null;
}

export interface AdminGameListItem {
  id: number;
  key: string;
  name: string;
  levelId: number;
  levelNumber: number;
  levelTitle: string;
  orderIndex: number;
  pointsReward: number;
  haveNextLevel: boolean;
  isPublished: boolean;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminGameListResponse {
  items: AdminGameListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminGameDetail {
  id: number;
  key: string;
  name: string;
  levelId: number;
  levelNumber: number;
  levelTitle: string;
  orderIndex: number;
  successMessage: string | null;
  haveNextLevel: boolean;
  pointsReward: number;
  isPublished: boolean;
  steps: AdminGameStepItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminGameSubmissionItem {
  id: number;
  memberId: number;
  memberName: string;
  memberEmail: string | null;
  memberAvatar: string | null;
  gameId: number;
  gameKey: string;
  gameName: string;
  levelNumber: number;
  note: string | null;
  attachments: GameSubmissionAttachment[] | null;
  confidenceScore: number | null;
  listAnswers: string[] | null;
  reflectiveAnswer: string | null;
  createdAt: Date;
}

export interface AdminGameSubmissionsResponse {
  items: AdminGameSubmissionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

