import {
  Controller,
  Get,
  Header,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { DocumentsService } from './documents.service.js';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('invoices/order/:orderId')
  @ApiOperation({ summary: 'Get invoice data for an order' })
  async getInvoice(@Param('orderId') orderId: string) {
    return this.documentsService.generateInvoice(orderId);
  }

  @Get('invoices/order/:orderId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable tax invoice HTML for an order' })
  async getInvoiceHtml(@Param('orderId') orderId: string) {
    return this.documentsService.getInvoiceHtml(orderId);
  }

  @Get('packing-slips/order/:orderId')
  @ApiOperation({ summary: 'Get packing slip data for an order' })
  async getPackingSlip(@Param('orderId') orderId: string) {
    return this.documentsService.generatePackingSlip(orderId);
  }

  @Get('packing-slips/order/:orderId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable packing slip HTML for an order' })
  async getPackingSlipHtml(@Param('orderId') orderId: string) {
    return this.documentsService.getPackingSlipHtml(orderId);
  }

  @Get('credit-notes/return/:returnId')
  @ApiOperation({ summary: 'Get credit note data for a return' })
  async getCreditNote(@Param('returnId') returnId: string) {
    return this.documentsService.generateCreditNote(returnId);
  }

  @Get('credit-notes/return/:returnId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable credit note HTML for a return' })
  async getCreditNoteHtml(@Param('returnId') returnId: string) {
    return this.documentsService.getCreditNoteHtml(returnId);
  }

  @Get('refund-receipts/return/:returnId')
  @ApiOperation({ summary: 'Get refund receipt data for a return' })
  async getRefundReceipt(@Param('returnId') returnId: string) {
    return this.documentsService.generateRefundReceipt(returnId);
  }

  @Get('refund-receipts/return/:returnId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable refund receipt HTML for a return' })
  async getRefundReceiptHtml(@Param('returnId') returnId: string) {
    return this.documentsService.getRefundReceiptHtml(returnId);
  }

  @Get('shipping-labels/order/:orderId')
  @ApiOperation({ summary: 'Get shipping label data for an order' })
  async getShippingLabel(@Param('orderId') orderId: string) {
    return this.documentsService.generateShippingLabel(orderId);
  }

  @Get('shipping-labels/order/:orderId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable shipping label HTML for an order' })
  async getShippingLabelHtml(@Param('orderId') orderId: string) {
    return this.documentsService.getShippingLabelHtml(orderId);
  }

  @Get('order-summaries/order/:orderId')
  @ApiOperation({ summary: 'Get order summary data for an order' })
  async getOrderSummary(@Param('orderId') orderId: string) {
    return this.documentsService.generateOrderSummary(orderId);
  }

  @Get('order-summaries/order/:orderId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Get printable order summary HTML for an order' })
  async getOrderSummaryHtml(@Param('orderId') orderId: string) {
    return this.documentsService.getOrderSummaryHtml(orderId);
  }

  @Get('company-details')
  @ApiOperation({ summary: 'Get company legal and tax details' })
  async getCompanyDetails() {
    return this.documentsService.getCompanyLegalDetails();
  }
}
