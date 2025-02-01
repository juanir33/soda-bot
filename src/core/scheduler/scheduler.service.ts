import * as cron from 'node-cron';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AlertsService } from '../../modules/alerts/alerts.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(private readonly alertsService: AlertsService) {}

  onModuleInit() {
    // Ejecutar el chequeo de recordatorios cada día a las 9 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Ejecutando recordatorio de uso...');
      this.alertsService.checkUsageReminder().catch((error) => {
        console.error('Error executing usage reminder:', error);
      });
    });
    // Ejecutar el envío del informe semanal cada lunes a las 10 AM
    cron.schedule('0 10 * * 1', () => {
      console.log('Ejecutando envío de informe semanal...');
      this.alertsService.sendWeeklySiphonReport().catch((error) => {
        console.error('Error executing weekly report:', error);
      });
    });
  }
}
