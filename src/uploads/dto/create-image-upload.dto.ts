import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class CreateImageUploadDto {
    @IsNotEmpty()
    @IsString()
    fileName: string;

    @IsString()
    @IsIn(["image/png", "image/jpeg", "image/webp"])
    contentType: string;

    @IsInt()
    @Min(1)
    @Max(5 * 1024 * 1024)
    size: number;
}