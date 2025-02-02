export interface IUserModel {
  userId: string;
  machineType?: 'manual' | 'electric' | null; // Nuevo campo
  telegramChatId?: string;
  phoneNumber?: string;
  name?: string;
  email?: string;
  createdAt: string;
  activeSiphonId?: string;
  token: string;
}

export interface ISiphonModel {
  ownerId: string;
  connectedAt: Date | null;
  capacity: number;
  remaining: number;
  status: 'in_use' | 'full' | 'empty';
  active: boolean;
  alertsSent: number[];
  id: string;
  alias: string;
  percentage?: number;
  estimatedBottles?: number;
}

export interface IUsageLogModel {
  siphonId: string;
  userId: string;
  date: Date;
  shots: number;
}

export interface IAlertModel {
  siphonId: string;
  userId: string;
  level: number;
  date: Date;
}

export interface IHistoryUsageModel {
  siphonId: string;
  userId: string;
  usageDate: string;
  shots: number;
  remaining: number;
  percentage: number;
  gasConsumed: number;
}
