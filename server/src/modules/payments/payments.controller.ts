import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Inject,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentIntentDto } from './dto/create-intent.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { CodPaymentDto } from './dto/cod-payment.dto.js';
import { CancelPaymentDto } from './dto/cancel-payment.dto.js';
import { MockCompletePaymentDto } from './dto/mock-complete-payment.dto.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
  ) {}

  @Get('key')
  @ApiOperation({ summary: 'Get public Razorpay Key ID for client checkout' })
  @ApiResponse({ status: 200, description: 'Public Razorpay configuration retrieved.' })
  getPublicKey() {
    return this.paymentsService.getPublicKey();
  }

  @Post('create-intent')
  @ApiOperation({ summary: 'Initializes a payment session for the order total' })
  @ApiResponse({
    status: 201,
    description: 'Payment session created with order amount in paise.',
  })
  @ApiResponse({ status: 400, description: 'Order already paid or invalid total.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('verify')
  @ApiOperation({
    summary:
      'Verifies cryptographic payment signature and marks order payment.status = paid',
  })
  @ApiResponse({
    status: 200,
    description: 'Signature verified and order marked as paid.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or payment verification failed.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('cod')
  @ApiOperation({
    summary:
      'Confirm Cash on Delivery without gateway intent, keeping payment.status = pending',
  })
  @ApiResponse({
    status: 200,
    description: 'Cash on Delivery registered for order.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async confirmCod(@Body() dto: CodPaymentDto) {
    return this.paymentsService.confirmCodPayment(dto);
  }

  @Post('cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record that the customer closed the payment window without paying' })
  async cancelPayment(@Body() dto: CancelPaymentDto) {
    return this.paymentsService.cancelPayment(dto);
  }

  @Post('mock/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'DEVELOPMENT ONLY: complete a mock payment with a chosen outcome' })
  async completeMockPayment(@Body() dto: MockCompletePaymentDto) {
    return this.paymentsService.completeMockPayment(dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook signature verification & event ingestion' })
  async handleWebhook(
    @Body() payload: any,
    @Req() req: any,
  ) {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    return this.paymentsService.handleWebhook(payload, signature, req.rawBody);
  }
}
