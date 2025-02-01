import { forwardRef, Module } from '@nestjs/common';

import { UsageModule } from 'src/modules/usage/usage.module';
import { TelegramBotService } from './telegram.service';
import { FirebaseModule } from 'src/modules/firebase/firebase.module';
import { SiphonsModule } from 'src/modules/shipons/siphons.module';

import { AlertsModule } from 'src/modules/alerts/alerts.module';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    FirebaseModule,
    UsageModule,
    SiphonsModule,
    forwardRef(() => AlertsModule),
  ],
  providers: [TelegramBotService],
  controllers: [TelegramController],

  exports: [TelegramBotService],
})
export class TelegramModule {}
