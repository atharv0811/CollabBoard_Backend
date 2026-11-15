import { IsNotEmpty, IsObject, IsString, MaxLength } from "class-validator";
import { Prisma } from "../../generated/prisma/client.js";

export class CreateBoardDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;

    @IsObject()
    document: Prisma.InputJsonValue;
}