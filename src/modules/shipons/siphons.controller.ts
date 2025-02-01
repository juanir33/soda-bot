import { Controller, Post, Body } from '@nestjs/common';
import { SiphonsService } from './siphons.service';

@Controller('siphons')
export class SiphonsController {
  constructor(private readonly siphonsService: SiphonsService) {}

  @Post('add')
  addSiphon(@Body() body: { userId: string; alias: string }) {
    return this.siphonsService.addSiphon(body.userId, body.alias);
  }

  @Post('connect')
  connectSiphon(@Body() body: { siphonId: string }) {
    return this.siphonsService.connectSiphon(body.siphonId, 11);
  }

  @Post('recharge')
  rechargeSiphon(@Body() body: { siphonId: string }) {
    return this.siphonsService.rechargeSiphon(body.siphonId);
  }
}
