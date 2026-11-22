import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service.js';
import { UploadsController } from './uploads.controller.js';
import { R2Service } from './r2.service.js';
import { SecurityModule } from '../security/security.module.js';

@Module({
  imports: [SecurityModule],
  providers: [UploadsService, R2Service],
  controllers: [UploadsController],
  exports: [R2Service]
})
export class UploadsModule { }
