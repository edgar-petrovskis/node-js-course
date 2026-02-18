import { isUUID } from 'class-validator';
import type { Response } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { OrdersService } from '../../application/orders/orders.service';
import { Order } from '../../infrastructure/entities/order.entity';

import {
  CreateOrderResponseDto,
  CreateOrderResponseItemDto,
} from './dto/create-order-response.dto';
import { CreateOrderDto } from './dto/create-order.dto';

const STUB_USER_ID = '00000000-0000-0000-0000-000000000001';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'UUID key used for idempotent order creation',
  })
  @ApiCreatedResponse({
    description: 'New order created',
    type: CreateOrderResponseDto,
  })
  @ApiOkResponse({
    description: 'Existing order returned for duplicate idempotency key',
    type: CreateOrderResponseDto,
  })
  async create(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateOrderDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CreateOrderResponseDto> {
    if (!isUUID(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID');
    }

    const result = await this.ordersService.createOrder(
      STUB_USER_ID,
      idempotencyKey,
      dto.items,
    );

    response.status(result.isDuplicate ? HttpStatus.OK : HttpStatus.CREATED);

    return this.mapOrderToResponse(result.order);
  }

  private mapOrderToResponse(order: Order): CreateOrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmountCents,
      items: (order.items ?? []).map(
        (item): CreateOrderResponseItemDto => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchaseCents,
        }),
      ),
    };
  }
}
