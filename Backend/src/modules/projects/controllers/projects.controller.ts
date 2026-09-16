import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/requests/create-project.dto';
import { UpdateProjectDto } from '../dto/requests/update-project.dto';
import { ProjectResponseDto } from '../dto/responses/project.response.dto';
import { toProjectResponseDto } from '../mappers/project.mapper';

@ApiTags('projects')
@Controller('organizations/:orgId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @RequirePermission(PERMISSIONS.PROJECT_CREATE)
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @Post()
  async create(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(orgId, dto);
    return toProjectResponseDto(project);
  }

  @RequirePermission(PERMISSIONS.PROJECT_READ)
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  @Get()
  async list(@Param('orgId', ParseUuidPipe) orgId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.projectsService.list(orgId);
    return projects.map(toProjectResponseDto);
  }

  @RequirePermission(PERMISSIONS.PROJECT_READ)
  @ApiOkResponse({ type: ProjectResponseDto })
  @Get(':id')
  async findOne(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.findByIdOrThrow(orgId, id);
    return toProjectResponseDto(project);
  }

  @RequirePermission(PERMISSIONS.PROJECT_UPDATE)
  @ApiOkResponse({ type: ProjectResponseDto })
  @Patch(':id')
  async update(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(orgId, id, dto);
    return toProjectResponseDto(project);
  }

  @RequirePermission(PERMISSIONS.PROJECT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<void> {
    await this.projectsService.remove(orgId, id);
  }
}
