import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
import { TelegramBotService } from './telegram.service';
import TelegramBot from 'node-telegram-bot-api';
import { Request } from 'express';

@Controller('/webhook')
export class TelegramController {
  private secret: string = '323232';
  private readonly logger = new Logger(TelegramController.name);
  constructor(private readonly botService: TelegramBotService) {}

  @Post()
  async handleWebhook(@Req() req: Request, @Body() body: TelegramBot.Update) {
    if (this.secret === req.headers['x-telegram-bot-api-secret-token']) {
      if (!body.message) return this.logger.error('No message');
      await this.botService.handleMessage(body.message);
    }
    this.logger.error(
      'Webhook received token',
      req.headers['x-telegram-bot-api-secret-token'],
    );
  }
}
