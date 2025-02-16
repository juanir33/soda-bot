import { Module } from '@nestjs/common';

import { SiphonsModule } from './modules/shipons/siphons.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { UsageModule } from './modules/usage/usage.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AlertsService } from './modules/alerts/alerts.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './core/configuration';

@Module({
  imports: [
    SiphonsModule,
    AlertsModule,
    UsageModule,
    FirebaseModule,
    TelegramModule,
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],

  providers: [AlertsService],
})
export class AppModule {}
