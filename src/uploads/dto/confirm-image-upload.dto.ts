import { IsNotEmpty, IsString } from "class-validator";

export class ConfirmImageUploadDto {
    @IsNotEmpty()
    @IsString()
    objectKey: string;
}