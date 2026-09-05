import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminEventsController } from './admin-events.controller.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService],
})
export class EventsModule {}
