import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { FirebaseModule } from 'src/modules/firebase/firebase.module';

import { TelegramModule } from 'src/modules/telegram/telegram.module';
import { SchedulerService } from '../../core/scheduler/scheduler.service';

@Module({
  imports: [FirebaseModule, TelegramModule],
  providers: [AlertsService, SchedulerService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
