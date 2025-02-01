import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseConfig {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: 'https://<your-database-name>.firebaseio.com',
      });
    }
  }

  getFirestore() {
    return admin.firestore();
  }
}
