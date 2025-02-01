// firebase.service.ts
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class FirebaseService {
  constructor() {
    // Inicializar Firebase (credenciales del archivo JSON)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        //credential: admin.credential.cert(serviceaccout as ServiceAccount),
        credential: admin.credential.cert({
          projectId: process.env.PROJECT_ID,
          clientEmail: process.env.CLIENT_EMAIL,
          privateKey: process.env.PRIVATE_KEY,
        }),
      });
    }
  }
  get firestore() {
    return admin.firestore();
  }
  generateId() {
    return uuidV4();
  }
}
