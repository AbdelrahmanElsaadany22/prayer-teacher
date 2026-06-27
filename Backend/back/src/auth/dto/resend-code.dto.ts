import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ResendCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;
}
