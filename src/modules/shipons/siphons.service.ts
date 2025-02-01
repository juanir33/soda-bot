import { Injectable } from '@nestjs/common';

import { FirebaseService } from 'src/modules/firebase/firebase.service';
import { ISiphonModel } from 'src/interfaces';

@Injectable()
export class SiphonsService {
  private capacity: number = 60;
  constructor(private readonly firebase: FirebaseService) {}

  async addSiphon(userId: string, alias: string) {
    const db = this.firebase.firestore;
    const uid = this.firebase.generateId();
    const newSiphon: ISiphonModel = {
      ownerId: userId,
      capacity: this.capacity,
      remaining: this.capacity,
      status: 'full',
      active: false,
      connectedAt: null,
      alertsSent: [],
      id: uid,
      alias,
      percentage: 100,
      estimatedBottles: 60,
    };
    await db.collection('siphons').doc(uid).set(newSiphon);
    return newSiphon;
  }

  async connectSiphon(siphonId: string, chatId: number) {
    const userId = String(chatId);
    const db = this.firebase.firestore;
    const otherSiphons = await db
      .collection('siphons')
      .where('ownerId', '==', userId)
      .where('active', '==', true)
      .get();

    for (const doc of otherSiphons.docs) {
      await doc.ref.update({ active: false });
    }
    // Activar el sifón seleccionado
    const siphonRef = db.collection('siphons').doc(siphonId);
    const siphonSnap = await siphonRef.get();

    if (!siphonSnap.exists) {
      throw new Error(`No existe el sifón con ID: ${siphonId}`);
    }
    const siphonData = siphonSnap.data() as ISiphonModel;
    if (siphonData?.ownerId !== userId) {
      throw new Error('Este sifón no pertenece al usuario actual.');
    }

    await siphonRef.update({ active: true });
    return `Sifón ${siphonData.alias} activado correctamente.`;
  }

  async rechargeSiphon(siphonId: string) {
    const db = this.firebase.firestore;
    await db.collection('siphons').doc(siphonId).update({
      remaining: 100,
      status: 'full',
      alertsSent: [],
    });
    return { message: `Siphon ${siphonId} recharged.` };
  }

  async deactivateSiphon(userId: string, siphonId: string) {
    const db = this.firebase.firestore;
    const siphonRef = db.collection('siphons').doc(siphonId);
    const siphonSnap = await siphonRef.get();

    if (!siphonSnap.exists) {
      throw new Error(`No existe el sifón con ID: ${siphonId}`);
    }
    const siphonData = siphonSnap.data();
    if (siphonData?.userId !== userId) {
      throw new Error('Este sifón no pertenece al usuario actual.');
    }

    await siphonRef.update({ active: false });
    return `Sifón ${siphonId} desactivado correctamente.`;
  }

  /**
   * Lista todos los sifones de un usuario
   */
  async listSiphons(userId: string) {
    const db = this.firebase.firestore;
    const snapshot = await db
      .collection('siphons')
      .where('ownerId', '==', userId)
      .get();

    if (snapshot.empty) {
      return 'No tienes sifones registrados.';
    }

    let message = 'Tus sifones:\n';
    snapshot.forEach((doc) => {
      const data = doc.data();
      message +=
        `\nID: ${doc.id}\n` +
        `Capacidad: ${data.capacity}\n` +
        `Restante: ${data.remaining}\n` +
        `Activo: ${data.active}\n` +
        '----------------------\n';
    });
    return message;
  }
  async getSiphons(userId: string) {
    const db = this.firebase.firestore;
    const snapshot = await db
      .collection('siphons')
      .where('ownerId', '==', userId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const siphons = snapshot.docs.map((doc) => doc.data());
    return siphons as ISiphonModel[];
  }

  async toggleSiphon(siphonId: string) {
    const db = this.firebase.firestore;
    const snapDoc = await db.collection('siphons').doc(siphonId).get();
    if (!snapDoc.exists) {
      throw new Error(`No existe el sifón con ID: ${siphonId}`);
    }
    try {
      const { alias, active } = snapDoc?.data() as ISiphonModel;
      await snapDoc.ref.update({ active: !active });
      return `Sifón ${alias} actualizado correctamente.`;
    } catch (error) {
      console.error(error);
      throw new Error('Error al actualizar el sifón.');
    }
  }
}
