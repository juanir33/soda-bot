// firebase.service.ts
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class FirebaseService {
  get firestore() {
    return admin.firestore();
  }
  generateId() {
    return uuidV4();
  }
}
