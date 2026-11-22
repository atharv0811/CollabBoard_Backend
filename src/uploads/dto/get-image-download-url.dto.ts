import { IsNotEmpty, IsString } from "class-validator";

export class GetImageDownloadUrlDto {
    @IsString()
    @IsNotEmpty()
    objectKey: string;
}