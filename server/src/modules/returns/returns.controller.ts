import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { CreateReturnRequestDto } from './dto/create-return.dto.js';
import {
  AdminApproveReturnDto,
  AdminCompleteExchangeDto,
  AdminInspectReturnDto,
  AdminProcessRefundDto,
  AdminRejectReturnDto,
  AdminSchedulePickupDto,
} from './dto/admin-return-actions.dto.js';
import { ReturnsService } from './returns.service.js';

@ApiTags('Returns & Exchanges')
@Controller()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('returns/request')
  @ApiOperation({ summary: 'Submit a return or exchange request' })
  async requestReturn(
    @Body() dto: CreateReturnRequestDto,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.returnsService.requestReturn(dto, user?.id);
  }

  @Get('returns/my-returns')
  @ApiOperation({ summary: 'Get return requests for current user' })
  async getMyReturns(@CurrentUser() user: UserDocument) {
    return this.returnsService.getMyReturns(user.id);
  }

  @Get('returns/eligibility/:orderId')
  @ApiOperation({ summary: 'Check if an order is eligible for return/exchange' })
  async checkEligibility(
    @Param('orderId') orderId: string,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.returnsService.checkEligibility(orderId, user?.id);
  }

  @Get('returns/:id')
  @ApiOperation({ summary: 'Get details of a return request' })
  async getReturn(
    @Param('id') id: string,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.returnsService.getReturnById(
      id,
      user?.id,
      user?.role === 'admin',
    );
  }

  @Post('returns/:id/cancel')
  @ApiOperation({ summary: 'Customer cancels their return request' })
  async cancelReturn(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.returnsService.cancelReturn(id, user.id);
  }

  // ──────────────────────────────────────────────────────────
  // Admin Operations
  // ──────────────────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/returns')
  @ApiOperation({ summary: 'Admin list all returns and exchanges' })
  async adminListReturns(
    @Query('status') status?: string,
    @Query('requestType') requestType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.returnsService.adminListReturns({
      status,
      requestType,
      search,
      limit: limit ? parseInt(limit, 10) : 25,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @AdminOnly()
  @Get('admin/returns/:id')
  @ApiOperation({ summary: 'Admin get return details' })
  async adminGetReturn(@Param('id') id: string) {
    return this.returnsService.getReturnById(id, undefined, true);
  }

  @AdminOnly()
  @Post('admin/returns/:id/approve')
  @ApiOperation({ summary: 'Admin approve a return request' })
  async adminApproveReturn(
    @Param('id') id: string,
    @Body() dto: AdminApproveReturnDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminApproveReturn(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }

  @AdminOnly()
  @Post('admin/returns/:id/schedule-pickup')
  @ApiOperation({ summary: 'Admin schedule return pickup courier' })
  async adminSchedulePickup(
    @Param('id') id: string,
    @Body() dto: AdminSchedulePickupDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminSchedulePickup(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }

  @AdminOnly()
  @Post('admin/returns/:id/mark-received')
  @ApiOperation({ summary: 'Admin mark return package received at warehouse' })
  async adminMarkReceived(
    @Param('id') id: string,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminMarkReceived(id, admin?.email || 'Admin');
  }

  @AdminOnly()
  @Post('admin/returns/:id/inspect')
  @ApiOperation({ summary: 'Admin submit item inspection results' })
  async adminInspectReturn(
    @Param('id') id: string,
    @Body() dto: AdminInspectReturnDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminInspectReturn(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }

  @AdminOnly()
  @Post('admin/returns/:id/process-refund')
  @ApiOperation({ summary: 'Admin process refund or issue store credit' })
  async adminProcessRefund(
    @Param('id') id: string,
    @Body() dto: AdminProcessRefundDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminProcessRefund(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }

  @AdminOnly()
  @Post('admin/returns/:id/complete-exchange')
  @ApiOperation({ summary: 'Admin mark exchange fulfilled' })
  async adminCompleteExchange(
    @Param('id') id: string,
    @Body() dto: AdminCompleteExchangeDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminCompleteExchange(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }

  @AdminOnly()
  @Post('admin/returns/:id/reject')
  @ApiOperation({ summary: 'Admin reject return request' })
  async adminRejectReturn(
    @Param('id') id: string,
    @Body() dto: AdminRejectReturnDto,
    @CurrentUser() admin?: UserDocument,
  ) {
    return this.returnsService.adminRejectReturn(
      id,
      dto,
      admin?.email || 'Admin',
    );
  }
}
