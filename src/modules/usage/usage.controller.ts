import { Body, Controller, Post } from '@nestjs/common';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post('register')
  registerUsage(
    @Body() body: { userId: string; siphonId: string; shots: number },
  ) {
    return this.usageService.registerUsage(body.userId, body.shots);
  }
}
