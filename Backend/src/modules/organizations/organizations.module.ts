import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './controllers/organizations.controller';
import { MembershipsController } from './controllers/memberships.controller';
import { InvitationsController } from './controllers/invitations.controller';
import { InvitationsAcceptController } from './controllers/invitations-accept.controller';
import { OrganizationsService } from './services/organizations.service';
import { MembershipsService } from './services/memberships.service';
import { InvitationsService } from './services/invitations.service';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { MembershipsRepository } from './repositories/memberships.repository';
import { InvitationsRepository } from './repositories/invitations.repository';
import { Organization } from './entities/organization.entity';
import { Membership } from './entities/membership.entity';
import { Invitation } from './entities/invitation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Membership, Invitation])],
  controllers: [
    OrganizationsController,
    MembershipsController,
    InvitationsController,
    InvitationsAcceptController,
  ],
  providers: [
    OrganizationsService,
    MembershipsService,
    InvitationsService,
    OrganizationsRepository,
    MembershipsRepository,
    InvitationsRepository,
  ],
  exports: [OrganizationsService, MembershipsService],
})
export class OrganizationsModule {}
