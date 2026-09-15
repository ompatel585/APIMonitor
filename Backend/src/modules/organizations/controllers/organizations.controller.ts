import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto } from '../dto/requests/create-organization.dto';
import { OrganizationResponseDto } from '../dto/responses/organization.response.dto';
import { toOrganizationResponseDto } from '../mappers/organization.mapper';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.createWithOwner(dto.name, user.id);
    return toOrganizationResponseDto(organization);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.findByIdForActor(id, user.id);
    return toOrganizationResponseDto(organization);
  }
}
