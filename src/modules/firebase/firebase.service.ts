// firebase.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { IUserModel } from 'src/interfaces';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class FirebaseService {
  constructor(private readonly jwtService: JwtService) {
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

  generateShortLivedToken(chatId: string) {
    const payload = { chatId };
    const token = this.jwtService.sign(payload, { expiresIn: '5m' }); // Expira en 5 minutos

    // Puedes guardar el CSRF token en la base de datos o en caché si es necesario
    return token;
  }
  verifyShortLivedToken(token: string) {
    try {
      const decoded = this.jwtService.verify<{ token: string }>(token);
      // Aquí podrías verificar el CSRF token en caché o en la base de datos
      return !!decoded;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false; // Token inválido o expirado
    }
  }

  async addToken(id: string) {
    const token = this.generateShortLivedToken(id);
    const db = this.firestore;
    await db.collection('users').doc(id).update({ token });
  }

  async isAuthenticated(id: string) {
    const db = this.firestore;
    const snapshot = await db.collection('users').doc(id).get();
    if (!snapshot.exists) return false;
    const { token } = snapshot.data() as IUserModel;
    const validToken = this.verifyShortLivedToken(token);
    if (!validToken) return false;
    return true;
  }
}
