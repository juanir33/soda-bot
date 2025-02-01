import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { AlertsService } from 'src/modules/alerts/alerts.service';

import { FirebaseService } from 'src/modules/firebase/firebase.service';
import { IHistoryUsageModel, ISiphonModel, IUserModel } from 'src/interfaces';

class SiphonNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiphonNotFoundError';
  }
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly firebase: FirebaseService,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertService: AlertsService,
  ) {}

  private async getActiveSiphon(chatId: string) {
    const db = this.firebase.firestore;
    const siphonRef = db
      .collection('siphons')
      .where('ownerId', '==', chatId)
      .where('active', '==', true);

    const siphonSnapshot = await siphonRef.get();
    if (siphonSnapshot.empty) {
      throw new SiphonNotFoundError('No active siphon found.');
    }

    return siphonSnapshot.docs[0];
  }

  private calculateUsageDetails(
    siphon: ISiphonModel,
    machineType: 'manual' | 'electric',
    shots?: number,
  ) {
    // Gas per shot based on machine type
    const gasPerShot = machineType === 'manual' ? 0.25 : 0.33; // Liters per shot

    const gasUsed = shots ? shots * gasPerShot : 0;
    const remaining = siphon.remaining - gasUsed;
    const percentage = (remaining / siphon.capacity) * 100;
    const estimatedBottles = Math.floor(
      remaining / gasPerShot / (machineType === 'manual' ? 4 : 3),
    );

    return { gasPerShot, gasUsed, remaining, percentage, estimatedBottles };
  }

  async registerUsage(chatId: string, shots: number) {
    const db = this.firebase.firestore;
    const userRef = db.collection('users').doc(chatId);
    const user = (await userRef.get()).data() as IUserModel;

    const siphonDoc = await this.getActiveSiphon(chatId);
    const siphon = siphonDoc.data() as ISiphonModel;

    const { remaining, percentage, estimatedBottles, gasUsed } =
      this.calculateUsageDetails(siphon, user.machineType ?? 'manual', shots);

    const historyusage: IHistoryUsageModel = {
      siphonId: siphon.id,
      userId: chatId,
      usageDate: new Date().toISOString(),
      shots,
      remaining,
      percentage,
      gasConsumed: gasUsed,
    };
    await siphonDoc.ref.update({ remaining, estimatedBottles, percentage });
    await this.saveHistoryUsage(historyusage);
    const message = `Se registraron ${shots} disparos. Gas restante: ${percentage.toFixed(
      2,
    )}%. Aproximadamente ${estimatedBottles} botellas restantes.`;

    await this.alertService.checkAlerts(chatId, siphon.id);

    return message;
  }

  async rechargeSiphon(chatId: string, siphonId: string) {
    this.logger.log(`Recharging siphon for chatId: ${chatId}`);
    const db = this.firebase.firestore;
    try {
      const siphonDoc = await this.getSiphonRef(siphonId);
      await db
        .collection('siphons')
        .doc(siphonId)
        .update({ remaining: siphonDoc.capacity });
      this.logger.log(`Siphon recharged for chatId: ${chatId}`);
      return 'Sifón recargado correctamente.';
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(
          `Error recharging siphon for chatId: ${chatId}`,
          err.stack,
        );
        throw err;
      }
    }
  }

  async getSiphonStatus(chatId: string) {
    const siphonDoc = await this.getActiveSiphon(chatId);
    const siphon = siphonDoc.data() as ISiphonModel;
    const { percentage, estimatedBottles } = siphon;
    if (!percentage || !estimatedBottles)
      return 'No se pudo obtener el estado del sifón.';
    const progressBar = this.generateProgressBar(percentage, 15);
    return `Gas restante: ${percentage.toFixed(2)}%.\n\n${progressBar}\n\nAproximadamente ${estimatedBottles} botellas restantes.`;
  }

  private generateProgressBar(percentage: number, length: number): string {
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    // let colorEmoji: string;

    // // Determinar el emoji de color según el porcentaje de gas restante
    // if (percentage <= 25) {
    //   colorEmoji = '🔴'; // Bajo
    // } else if (percentage <= 75) {
    //   colorEmoji = '🟡'; // Medio
    // } else {
    //   colorEmoji = '🟢'; // Alto
    // }

    // const filledBar = colorEmoji.repeat(filledLength);
    // const emptyBar = '▫️'.repeat(emptyLength); // Indicador vacío

    const filledBar = '█'.repeat(filledLength);
    const emptyBar = '░'.repeat(emptyLength);

    return `[${filledBar}${emptyBar}]`;
  }
  async updateMachineType(chatId: string, machineType: 'manual' | 'electric') {
    const db = this.firebase.firestore;
    const userRef = db.collection('users').doc(chatId);
    await userRef.set({ machineType }, { merge: true });
  }

  async checkUser(chatId: string) {
    try {
      const db = this.firebase.firestore;
      const userRef = db.collection('users').doc(chatId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        const newUser: IUserModel = {
          userId: chatId,
          createdAt: new Date().toISOString(),
          machineType: null,
        };
        await userRef.set(newUser);
      }
      return userSnap.data() as IUserModel;
    } catch (error) {
      if (error instanceof Error)
        this.logger.error('Error checking user', error.message);
    }
  }

  async getUserMachineType(
    chatId: string,
  ): Promise<'manual' | 'electric' | null> {
    const db = this.firebase.firestore;
    const userRef = db.collection('users').doc(chatId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return null;
    }

    const userData = userSnap.data() as IUserModel;
    return userData?.machineType || null;
  }

  async getSiphonRef(siponId: string): Promise<ISiphonModel> {
    const db = this.firebase.firestore;
    const siphonRef = db.collection('siphons').doc(siponId);
    const siphonSnap = await siphonRef.get();

    if (!siphonSnap.exists) {
      throw new SiphonNotFoundError(`Sifon no encontrado.`);
    }

    return siphonSnap.data() as ISiphonModel;
  }

  async saveHistoryUsage(usage: IHistoryUsageModel) {
    const db = this.firebase.firestore;
    try {
      const historyRef = db.collection('siphon_usage');
      await historyRef.add(usage);
      await this.updateLastUsageUser(usage.userId);
    } catch (error) {
      this.logger.error(error);
      throw new Error('Error guardando la historia de uso.');
    }
  }

  async updateLastUsageUser(userId: string) {
    const db = this.firebase.firestore;
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({ lastUsage: new Date().toISOString() });
      this.logger.verbose(`Updated ${userId}`, `lastUsage`);
    } catch (error) {
      this.logger.error(error);
      throw new Error('Error actualizando la última vez de uso.');
    }
  }
}
