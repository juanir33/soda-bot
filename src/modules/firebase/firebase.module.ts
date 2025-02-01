// firebase.module.ts
import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {
  constructor() {
    // Inicializar Firebase (credenciales del archivo JSON)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
        privateKey: process.env.PRIVATE_KEY,
      }),
      // databaseURL: 'https://<your-database-name>.firebaseio.com' (opcional si usas Firestore)
    });
  }
}
