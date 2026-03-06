import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ReviewService } from './review.service';
import { CreateReviewDto, ReviewableType } from './dto/create-review.dto';
import { ReviewQueryDto, AdminReviewQueryDto } from './dto/review-query.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';

@Controller('catalog/reviews')
@ApiTags('Reviews')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ─── Public Endpoints ───────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get reviews (cursor-paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async getReviews(@Query() query: ReviewQueryDto) {
    return this.reviewService.getReviews(query);
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get review statistics for a reviewable entity' })
  @ApiQuery({ name: 'reviewable_type', enum: ReviewableType })
  @ApiQuery({ name: 'reviewable_id', type: String })
  @ApiResponse({ status: 200, description: 'Review stats returned' })
  async getReviewStats(
    @Query('reviewable_type') reviewable_type: string,
    @Query('reviewable_id') reviewable_id: string,
  ) {
    if (!reviewable_type || !reviewable_id) {
      throw new BadRequestException('reviewable_type and reviewable_id are required');
    }
    return this.reviewService.getReviewStats(reviewable_type, reviewable_id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single review by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Review returned' })
  async getReview(@Param('id', ParseUUIDPipe) id: string) {
    const review = await this.reviewService.getReviewById(id);
    return { success: true, data: review, timestamp: new Date().toISOString() };
  }

  // ─── Customer Endpoints ─────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @Roles('customer')
  @ApiOperation({ summary: 'Create a review (customer only)' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewService.createReview(user.sub, dto);
    return { success: true, data: review, timestamp: new Date().toISOString() };
  }

  @Post(':id/helpful')
  @ApiBearerAuth()
  @Roles('customer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle helpful vote on a review' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Helpful vote toggled' })
  async toggleHelpful(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.reviewService.toggleHelpful(user.sub, id);
    return { success: true, data: result, timestamp: new Date().toISOString() };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('customer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own review (customer only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Review deleted' })
  async deleteReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reviewService.deleteReview(user.sub, id);
  }

  // ─── Vendor Endpoints ───────────────────────────────────────────────

  @Get('vendor/my-reviews')
  @ApiBearerAuth()
  @Roles('vendor_owner', 'vendor_staff')
  @ApiOperation({ summary: 'Get reviews for vendor store and products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor reviews returned' })
  async getVendorReviews(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!user.vendor_id) {
      throw new BadRequestException('No vendor associated with this user');
    }
    return this.reviewService.getVendorReviews(user.vendor_id, page, limit);
  }

  @Post(':id/response')
  @ApiBearerAuth()
  @Roles('vendor_owner', 'vendor_staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to a review (vendor only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Response added to review' })
  async respondToReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VendorResponseDto,
  ) {
    if (!user.vendor_id) {
      throw new BadRequestException('No vendor associated with this user');
    }
    const review = await this.reviewService.respondToReview(id, user.vendor_id, dto);
    return { success: true, data: review, timestamp: new Date().toISOString() };
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'List all reviews (admin, offset-paginated)' })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async adminListReviews(@Query() query: AdminReviewQueryDto) {
    return this.reviewService.adminListReviews(query);
  }

  @Post('admin/:id/approve')
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a review (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Review approved' })
  async adminApproveReview(@Param('id', ParseUUIDPipe) id: string) {
    const review = await this.reviewService.adminApproveReview(id);
    return { success: true, data: review, timestamp: new Date().toISOString() };
  }

  @Post('admin/:id/reject')
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a review (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Review rejected' })
  async adminRejectReview(@Param('id', ParseUUIDPipe) id: string) {
    const review = await this.reviewService.adminRejectReview(id);
    return { success: true, data: review, timestamp: new Date().toISOString() };
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Review deleted' })
  async adminDeleteReview(@Param('id', ParseUUIDPipe) id: string) {
    await this.reviewService.adminDeleteReview(id);
  }
}
