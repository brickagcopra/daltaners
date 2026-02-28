import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

interface UserRegisteredEvent {
  type: string;
  data: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
}

@Controller()
export class UserConsumer {
  private readonly logger = new Logger(UserConsumer.name);

  constructor(private readonly userService: UserService) {}

  @EventPattern('daltaners.users.events')
  async handleUserEvent(@Payload() message: UserRegisteredEvent) {
    this.logger.log(`Received event: ${message.type}`);

    if (message.type === 'com.daltaners.users.registered') {
      this.logger.log(`Creating profile for user: ${message.data.user_id}`);
      try {
        await this.userService.handleUserRegistered(message.data);
        this.logger.log(`Profile creation handled for user: ${message.data.user_id}`);
      } catch (error) {
        this.logger.error(
          `Failed to handle user registered event for user: ${message.data.user_id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }
  }
}
