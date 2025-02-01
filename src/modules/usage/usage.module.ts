import { forwardRef, Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { FirebaseModule } from 'src/modules/firebase/firebase.module';
import { AlertsModule } from 'src/modules/alerts/alerts.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => AlertsModule)],
  providers: [UsageService],
  controllers: [UsageController],
  exports: [UsageService],
})
export class UsageModule {}
