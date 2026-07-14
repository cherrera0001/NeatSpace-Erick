import { Module } from '@nestjs/common';
import {
  WalletController,
  ServicesWalletController,
  WebhooksController,
} from './neatwallet.controllers';

@Module({
  controllers: [WalletController, ServicesWalletController, WebhooksController],
})
export class NeatWalletModule {}
