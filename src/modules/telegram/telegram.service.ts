/* eslint-disable @typescript-eslint/no-misused-promises */

import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { UsageService } from '../usage/usage.service';
import TelegramBot from 'node-telegram-bot-api';
import { SiphonsService } from '../shipons/siphons.service';
import { HELP_MESSAGE } from 'src/helpers/constants';
import { ISiphonModel } from 'src/interfaces';
import { AlertsService } from 'src/modules/alerts/alerts.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string = process.env.BOT_TOKEN || 'default';
  private readonly secret_token: string | undefined = process.env.SECRET_TOKEN;
  constructor(
    private readonly usageService: UsageService,
    private readonly siphonsService: SiphonsService,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertService: AlertsService,
  ) {}

  onModuleInit() {
    //const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new TelegramBot(this.botToken, { webHook: true });
    this.bot
      .setWebHook(
        process.env.URL_WEBHOOK || '',

        {
          secret_token: this.secret_token,
        },
      )
      .catch((error) => {
        if (error instanceof Error) {
          this.logger.error(error.message);
        }
      });
    //this.bot.onText(/\/start/, (msg) => this.start(msg));
    // this.bot.onText(/\/configurar/, (msg) => this.configureMachine(msg));
    // this.bot.onText(/\/registrar_uso/, (msg) => this.registerUsage(msg));
    // this.bot.onText(/\/recargar_sifon/, (msg) => this.rechargeSiphon(msg));
    // this.bot.onText(/\/estado_sifon/, (msg) => this.checkSiphonStatus(msg));
    // this.bot.onText(/\/cargar_sifon (.+)/, (msg, match) =>
    //   this.createSiphon(msg, match),
    // );
    // this.bot.onText(/\/help/, (msg) => this.sendHelpMessage(msg));
    // this.bot.onText(/\/activar_sifon/, (msg) => this.activeSiphon(msg));
    // this.bot.onText(/\/listar_sifones/, (msg) => this.listSiphons(msg));
    // this.bot.onText(/\/reporte/, () =>
    //   this.alertService.sendWeeklySiphonReport(),
    // );
  }

  private async handleError(
    chatId: string,
    error: Error,
    defaultMessage: string,
  ) {
    const message = error.message || defaultMessage;
    this.logger.error(`In handleerror ${message}`);
    await this.bot.sendMessage(chatId, message);
  }

  // TODO mejorar para usar webhooks
  async handleMessage(message: TelegramBot.Message) {
    const text = message.text || '/help';
    switch (text) {
      case '/start':
        return this.start(message);
      case '/configurar':
        return this.configureMachine(message);
      case '/registrar_uso':
        return this.registerUsage(message);
      case '/recargar_sifon':
        return this.rechargeSiphon(message);
      case '/estado_sifon':
        return this.checkSiphonStatus(message);
      case '/cargar_sifon': {
        const match = message.text?.match(/\/cargar_sifon (.+)/);
        if (match) {
          return this.createSiphon(message, match);
        } else {
          // Handle the case where the match is null or undefined
          return this.sendHelpMessage(message);
        }
      }
      case '/help':
        return this.sendHelpMessage(message);
      case '/activar_sifon':
        return this.activeSiphon(message);
      case '/listar_sifones':
        return this.listSiphons(message);
      case '/reporte':
        return this.alertService.sendWeeklySiphonReport();
      default:
        return this.sendHelpMessage(message);
    }
  }
  async start(msg: TelegramBot.Message) {
    const chatId = String(msg.chat.id);
    await this.usageService.checkUser(chatId);
    await this.bot.sendMessage(
      chatId,
      '¡Bienvenido al sistema SodaStream! Usa /configurar para empezar.',
    );
  }

  async configureMachine(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(
      chatId,
      'Por favor, selecciona tu tipo de máquina:',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Manual (ART, TERRA, FIZZI, etc.)',
                callback_data: 'manual',
              },
            ],
            [{ text: 'Eléctrica (E-TERRA, POWER)', callback_data: 'electric' }],
          ],
        },
      },
    );

    // Handle the user's selection
    this.bot.once('callback_query', async (callbackQuery) => {
      const machineType = callbackQuery.data as 'manual' | 'electric';
      await this.usageService.updateMachineType(
        String(callbackQuery?.message?.chat.id),
        machineType,
      );
      await this.bot.sendMessage(
        chatId,
        `Máquina configurada como ${machineType}. ¡Todo listo para usar!`,
      );
    });
  }

  async rechargeSiphon(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      // Obtener y mostrar los sifones disponibles
      const siphons = await this.siphonsService.getSiphons(String(chatId));

      if (siphons.length === 0) {
        await this.bot.sendMessage(
          chatId,
          'No tienes sifones disponibles para recargar.',
        );
        return;
      }

      // Mostrar los sifones como opciones en un teclado inline
      await this.showSiphonSelection(chatId, siphons);
    } catch (error) {
      this.logger.error(error);
      await this.handleError(
        String(chatId),
        error,
        'Error al mostrar los sifones.',
      );
    }
  }

  private async showSiphonSelection(chatId: number, siphons: ISiphonModel[]) {
    const inlineKeyboard = siphons.map((siphon) => [
      {
        text: `Sifón ${siphon.alias} - ${siphon.percentage?.toFixed()}%`,
        callback_data: `recharge_${siphon.id}`,
      },
    ]);

    await this.bot.sendMessage(
      chatId,
      'Selecciona el sifón que deseas recargar:',
      {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      },
    );

    // Escuchar la selección del usuario
    this.bot.once('callback_query', async (callbackQuery) => {
      const siphonId: string =
        callbackQuery.data?.replace('recharge_', '') || '';

      try {
        await this.rechargeSelectedSiphon(chatId, siphonId);
        await this.bot.sendMessage(
          chatId,
          `✅ ¡El sifón ha sido recargado con éxito!`,
        );
      } catch (err) {
        await this.handleError(
          String(chatId),
          err,
          'Error al recargar el sifón.',
        );
      }
    });
  }

  private async rechargeSelectedSiphon(chatId: number, siphonId: string) {
    this.logger.log(
      `Recargando el sifón ${siphonId} para el usuario ${chatId}`,
    );
    await this.usageService.rechargeSiphon(String(chatId), siphonId);
  }

  async checkSiphonStatus(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const status = await this.usageService.getSiphonStatus(String(chatId));
    await this.bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
  }

  //   async registerUsage(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  //     const chatId = String(msg.chat.id);
  //     if (!match || isNaN(Number(match[1]))) {
  //       await this.bot.sendMessage(
  //         chatId,
  //         'Por favor, ingresa un número válido de disparos.',
  //       );
  //       return;
  //     }
  //     const shots = Number(match[1]);
  //     try {
  //       const resultMessage = await this.usageService.registerUsage(
  //         chatId,
  //         shots,
  //       );
  //       await this.bot.sendMessage(chatId, resultMessage);
  //     } catch (err) {
  //       await this.handleError(chatId, err, 'Error registrando uso');
  //     }
  //   }

  //   async registerUsage(msg: TelegramBot.Message) {
  //     const chatId = msg.chat.id;

  //     // Send a reply keyboard with predefined options
  //     await this.bot.sendMessage(
  //       chatId,
  //       'Selecciona el número de disparos que deseas registrar:',
  //       {
  //         reply_markup: {
  //           keyboard: [
  //             [{ text: '1' }, { text: '2' }, { text: '3' }],
  //             [{ text: '4' }, { text: '5' }, { text: '6' }],
  //           ], // Predefined options
  //           resize_keyboard: true,
  //           one_time_keyboard: true, // Hide the keyboard after selection
  //         },
  //       },
  //     );

  //     // Wait for the user's response
  //     this.bot.once('message', async (response) => {
  //       const shots = Number(response.text);

  //       if (isNaN(shots) || shots <= 0) {
  //         await this.bot.sendMessage(
  //           chatId,
  //           'Por favor, selecciona un número válido de disparos.',
  //         );
  //         return;
  //       }

  //       try {
  //         const resultMessage = await this.usageService.registerUsage(
  //           String(chatId),
  //           shots,
  //         );
  //         await this.bot.sendMessage(chatId, resultMessage);
  //       } catch (err) {
  //         await this.handleError(String(chatId), err, 'Error registrando uso');
  //       }
  //     });
  //   }

  async createSiphon(
    msg: TelegramBot.Message,
    match: RegExpMatchArray | null | undefined,
  ) {
    const chatId = String(msg.chat.id);
    const cilynderAlias = match && match[1] ? match[1] : '';

    try {
      const newSiphon = await this.siphonsService.addSiphon(
        chatId,
        cilynderAlias,
      );
      await this.bot.sendMessage(
        chatId,
        `✅ Sifón creado exitosamente:\nAlias: ${newSiphon.alias}\nCapacidad: ${newSiphon.capacity}\nActivo: ${newSiphon.active ? 'Sí' : 'No'}`,
      );
    } catch (err) {
      if (err instanceof Error) {
        await this.handleError(chatId, err, 'Error al crear sifón');
      }
    }
    this.logger.error('Error al crear sifón');
  }

  //   async activeSiphon(msg: TelegramBot.Message, match: RegExpExecArray | null) {
  //     const chatId = String(msg.chat.id);
  //     const siphonId = (match && match[1]) || '';

  //     try {
  //       const result = await this.siphonsService.connectSiphon(siphonId, chatId);
  //       await this.bot.sendMessage(chatId, result);
  //     } catch (err) {
  //       await this.handleError(chatId, err, 'Error al activar sifón');
  //     }
  //   }

  async activeSiphon(msg: TelegramBot.Message) {
    const chatId = String(msg.chat.id);

    try {
      const siphons = await this.siphonsService.getSiphons(chatId);

      if (siphons.length === 0) {
        await this.bot.sendMessage(chatId, 'No tienes sifones disponibles.');
        return;
      }

      // Create inline buttons for each siphon
      const inlineKeyboard = siphons.map((siphon) => [
        {
          text: `Sifón ${siphon.alias} (${siphon.remaining.toFixed()}L)`,
          callback_data: `activate_${siphon.id}`,
        },
      ]);

      await this.bot.sendMessage(
        chatId,
        'Selecciona el sifón que deseas activar:',
        {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        },
      );

      // Handle the user's selection
      this.bot.once('callback_query', async (callbackQuery) => {
        const siphonId: string =
          callbackQuery?.data?.replace('activate_', '') || '';
        try {
          const result = await this.siphonsService.connectSiphon(
            siphonId,
            Number(chatId),
          );
          await this.bot.sendMessage(chatId, result);
        } catch (err) {
          await this.handleError(chatId, err, 'Error al activar sifón');
        }
      });
    } catch (err) {
      await this.handleError(chatId, err, 'Error al listar sifones');
    }
  }

  async listSiphons(msg: TelegramBot.Message) {
    const chatId = String(msg.chat.id);

    try {
      const siphons = await this.siphonsService.getSiphons(chatId);

      if (siphons.length === 0) {
        await this.bot.sendMessage(chatId, 'No tienes sifones disponibles.');
        return;
      }

      // Create a message with inline buttons for each siphon
      const message = siphons
        .map(
          (siphon) =>
            `Sifón ${siphon.alias}\nCapacidad: ${siphon.capacity}L\nActivo: ${siphon.active ? '✅' : '❌'}`,
        )
        .join('\n\n');

      const inlineKeyboard = siphons.map((siphon) => [
        {
          text: `${siphon.active ? 'Desconectar' : 'Conectar'} - ${siphon.alias} `,
          callback_data: `toggle_${siphon.id}`,
        },
      ]);

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });

      // Handle the user's selection
      this.bot.once('callback_query', async (callbackQuery) => {
        const siphonId: string =
          callbackQuery?.data?.replace('toggle_', '') || '';
        try {
          const result = await this.siphonsService.toggleSiphon(siphonId);
          await this.bot.sendMessage(chatId, result);
        } catch (err) {
          await this.handleError(
            chatId,
            err,
            'Error al activar/desactivar sifón',
          );
        }
      });
    } catch (err) {
      await this.handleError(chatId, err, 'Error al listar sifones');
    }
  }

  private async sendHelpMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    try {
      await this.bot.sendMessage(chatId, HELP_MESSAGE, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error('Error enviando mensaje de ayuda:', error);
      await this.handleError(
        String(chatId),
        error,
        'Error al enviar mensaje de ayuda',
      );
    }
  }

  async registerUsage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      // Obtener el tipo de máquina del usuario
      const machineType = await this.usageService.getUserMachineType(
        String(chatId),
      );

      // Definir el teclado y el mensaje de selección
      const { keyboard, promptMessage } =
        this.getKeyboardAndPrompt(machineType);

      if (!keyboard || !promptMessage) {
        await this.bot.sendMessage(
          chatId,
          'No se encontró una configuración de máquina válida.',
        );
        return;
      }

      // Mostrar el teclado al usuario
      await this.showSelectionKeyboard(chatId, promptMessage, keyboard);

      // Esperar la respuesta del usuario y manejarla
      this.handleUserSelection(chatId, machineType);
    } catch (err) {
      await this.handleError(
        String(chatId),
        err,
        'Error obteniendo la configuración de la máquina',
      );
    }
  }

  private getKeyboardAndPrompt(machineType: 'manual' | 'electric' | null): {
    keyboard: TelegramBot.KeyboardButton[][];
    promptMessage: string;
  } {
    if (machineType === 'manual') {
      return {
        keyboard: [
          [{ text: '1' }, { text: '2' }, { text: '3' }],
          [{ text: '4' }, { text: '5' }, { text: '6' }],
        ],
        promptMessage: 'Selecciona el número de disparos que deseas registrar:',
      };
    } else if (machineType === 'electric') {
      return {
        keyboard: [
          [{ text: '🔵 Nivel 1' }],
          [{ text: '🟢 Nivel 2' }],
          [{ text: '🔴 Nivel 3' }],
        ],
        promptMessage: 'Selecciona el nivel de gasificación:',
      };
    }

    // Si no se encuentra el tipo de máquina

    throw new Error('Tipo de máquina no encontrado');
  }

  private async showSelectionKeyboard(
    chatId: number,
    promptMessage: string,
    keyboard: TelegramBot.KeyboardButton[][],
  ) {
    await this.bot.sendMessage(chatId, promptMessage, {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  private handleUserSelection(
    chatId: number,
    machineType: 'manual' | 'electric' | null,
  ) {
    this.bot.once('message', async (response) => {
      const userSelection = response.text?.trim();
      const shots = this.getShotsFromSelection(machineType, userSelection);

      if (shots === null) {
        await this.bot.sendMessage(
          chatId,
          'Por favor, selecciona un valor válido.',
        );
        return;
      }

      // Registrar el uso del sifón
      try {
        const resultMessage = await this.usageService.registerUsage(
          String(chatId),
          shots,
        );
        await this.bot.sendMessage(chatId, resultMessage);
      } catch (err) {
        await this.handleError(String(chatId), err, 'Error registrando uso');
      }
    });
  }

  private getShotsFromSelection(
    machineType: 'manual' | 'electric' | null,
    userSelection: string | undefined,
  ): number | null {
    if (machineType === 'manual') {
      const shots = Number(userSelection);
      return isNaN(shots) || shots <= 0 ? null : shots;
    }

    switch (userSelection) {
      case '🔵 Nivel 1':
        return 1;
      case '🟢 Nivel 2':
        return 3;
      case '🔴 Nivel 3':
        return 5;
      default:
        return null;
    }
  }

  async sendMessageToUser(chatId: number, message: string) {
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
}
