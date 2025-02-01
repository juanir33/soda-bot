// firebase.module.ts
import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import serviceAccount from './sodastream-app-firebase-adminsdk-d8c2k-f419fc9b0e.json';
import { ServiceAccount } from 'firebase-admin';

const serviceAccountTyped = serviceAccount as ServiceAccount;

@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {
  constructor() {
    // Inicializar Firebase (credenciales del archivo JSON)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountTyped),
      // databaseURL: 'https://<your-database-name>.firebaseio.com' (opcional si usas Firestore)
    });
  }
}
