import { Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/modules/firebase/firebase.service';
import { IHistoryUsageModel, ISiphonModel } from 'src/interfaces';
import { TelegramBotService } from 'src/modules/telegram/telegram.service';
import { exec } from 'child_process';
@Injectable()
export class AlertsService {
  private readonly alertLevels = [30, 15, 5];
  private readonly reminderIntervalMs = 3 * 24 * 60 * 60 * 1000; // 3 días en milisegundos

  constructor(
    private readonly firebase: FirebaseService,
    private readonly telegramBotService: TelegramBotService, // Integración con TelegramBotService
  ) {}

  /**
   * Verifica y envía alertas críticas si el nivel de gas alcanza umbrales.
   */
  async checkAlerts(userId: string, siphonId: string) {
    const db = this.firebase.firestore;
    const siphonRef = db.collection('siphons').doc(siphonId);
    const siphon = (await siphonRef.get()).data() as ISiphonModel;

    if (!siphon || siphon.percentage === undefined) return;

    for (const level of this.alertLevels) {
      if (siphon.percentage <= level && !siphon.alertsSent.includes(level)) {
        await this.sendAlert(userId, siphon.alias, level);
        siphon.alertsSent.push(level);
        await siphonRef.update({ alertsSent: siphon.alertsSent });
      }
    }
  }

  /**
   * Envía una alerta tras la recarga del sifón.
   */
  async alertOnRecharge(userId: string, siphonId: string) {
    const message = `🔄 El sifón ${siphonId} ha sido recargado con éxito. ¡Está listo para su uso nuevamente!`;
    await this.telegramBotService.sendMessageToUser(Number(userId), message);
  }

  /**
   * Verifica y envía alertas de recordatorio si no se ha registrado uso en los últimos días.
   */
  async checkUsageReminder() {
    const db = this.firebase.firestore;
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const lastUsage = userDoc.data().lastUsage
        ? new Date(userDoc.data().lastUsage)
        : null;

      if (
        !lastUsage ||
        Date.now() - lastUsage.getTime() > this.reminderIntervalMs
      ) {
        const message =
          '⏰ Recordatorio: No has registrado uso de tu SodaStream en los últimos días. ¿Tienes gas suficiente?';
        await this.telegramBotService.sendMessageToUser(
          Number(userId),
          message,
        );
      }
    }
  }

  /**
   * Método genérico para enviar alertas críticas.
   */
  private async sendAlert(userId: string, siphon: string, level: number) {
    const message = `🚨 *Alerta crítica:* El sifón ${siphon} está al ${level}% de gas. Recarga pronto para evitar quedarte sin gas.`;
    await this.telegramBotService.sendMessageToUser(Number(userId), message);
  }

  /**
   * Ejecuta un script Python para predecir la fecha de agotamiento del gas.
   * @param usageHistory Historial de uso del sifón
   */
  private async predictDepletionWithPython(
    usageHistory: { date: string; remaining: number }[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convertir el historial de uso a JSON
      const inputJson = JSON.stringify(usageHistory);

      // Ejecutar el script de Python
      const process = exec(
        'python3 src/core/scripts/depletion.py',
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Error al ejecutar el script: ${error.message}`));
          } else if (stderr) {
            reject(new Error(`Error en el script de Python: ${stderr}`));
          } else {
            resolve(stdout.trim());
          }
        },
      );

      // Enviar los datos al script a través de la entrada estándar (stdin)
      if (process.stdin) {
        process.stdin.write(inputJson);
        process.stdin.end();
      } else {
        reject(new Error('Failed to write to stdin of the process'));
      }
    });
  }

  private async getSiphonUsageHistory(
    userId: string,
    siphonId: string,
  ): Promise<{ date: string; remaining: number }[]> {
    const db = this.firebase.firestore;
    console.log(userId, siphonId);
    try {
      const usageSnapshot = await db
        .collection('siphon_usage')
        .where('userId', '==', userId)
        .where('siphonId', '==', siphonId)
        .orderBy('usageDate', 'asc')
        .get();

      if (usageSnapshot.empty) {
        return [];
      }

      return usageSnapshot.docs.map((doc) => {
        const data = doc.data() as IHistoryUsageModel;
        return { date: data.usageDate, remaining: data.remaining };
      });
    } catch (error) {
      if (error instanceof Error) {
        await this.telegramBotService.sendMessageToUser(
          Number(userId),
          'Error al procesar el informe',
        );
      }
      throw new Error(`Error al obtener el historial de uso: ${error}`);
    }
  }

  async sendWeeklySiphonReport() {
    const db = this.firebase.firestore;
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const siphons = await this.getSiphonsForUser(userId);

      if (siphons.length === 0) {
        await this.telegramBotService.sendMessageToUser(
          Number(userId),
          '🔍 No tienes sifones registrados.',
        );
        continue;
      }

      const message = await this.generateSiphonReportMessage(userId, siphons);
      await this.telegramBotService.sendMessageToUser(Number(userId), message);
    }
  }

  private async getSiphonsForUser(userId: string): Promise<ISiphonModel[]> {
    const db = this.firebase.firestore;
    const siphonsSnapshot = await db
      .collection('siphons')
      .where('ownerId', '==', userId)
      .get();

    if (siphonsSnapshot.empty) {
      return [];
    }

    return siphonsSnapshot.docs.map((doc) => doc.data() as ISiphonModel);
  }
  async generateSiphonReportMessage(
    userId: string,
    siphons: ISiphonModel[],
  ): Promise<string> {
    let message = '*📊 Informe semanal de tus sifones:*\n\n';

    for (const siphon of siphons) {
      const usageHistory = await this.getSiphonUsageHistory(userId, siphon.id);
      console.log('🚀 ~ AlertsService ~ usageHistory:', usageHistory);

      let depletionText =
        '🔍 No hay datos suficientes para predecir la fecha de agotamiento. Necesitas al menos 10';
      if (usageHistory.length >= 10) {
        try {
          const depletionDate =
            await this.predictDepletionWithPython(usageHistory);
          depletionText = `🗓️ Proyección: El gas se agotará el ${depletionDate}`;
        } catch (error) {
          if (error instanceof Error) {
            console.error(error.message);
            depletionText = `⚠️ Error en la predicción: ${error.message}`;
          }
        }
      }

      const percentage = ((siphon.remaining / siphon.capacity) * 100).toFixed(
        2,
      );
      message += `🔹 *Sifón:* ${siphon.alias}\n`;
      message += `    - Gas restante: ${percentage}%\n`;
      message += `    - Botellas estimadas: ${siphon.estimatedBottles || 'Desconocido'}\n`;
      message += `    - ${depletionText}\n\n`;
    }

    message +=
      '💡 *Consejo:* Asegúrate de verificar regularmente tus sifones para no quedarte sin gas.';
    return message;
  }
}
