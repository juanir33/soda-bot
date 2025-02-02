// firebase.module.ts
import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [FirebaseService, JwtService],
  exports: [FirebaseService, JwtService],
})
export class FirebaseModule {}
