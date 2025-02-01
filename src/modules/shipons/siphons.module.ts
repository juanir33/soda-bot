import { Module } from '@nestjs/common';
import { SiphonsController } from './siphons.controller';
import { SiphonsService } from './siphons.service';
import { FirebaseService } from 'src/modules/firebase/firebase.service';

@Module({
  controllers: [SiphonsController],
  providers: [SiphonsService, FirebaseService],
  exports: [SiphonsService],
})
export class SiphonsModule {}
