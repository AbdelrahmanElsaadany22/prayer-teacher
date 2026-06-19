import { IsString, IsNumber, IsObject, Min, Max } from 'class-validator';

export class CreatePrayerDto {
  @IsString()
  prayerName!: string;

  @IsNumber()
  @Min(0)
  rakas!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy!: number;

  @IsString()
  duration!: string;

  @IsNumber()
  @Min(0)
  mistakes!: number;

  @IsObject()
  mistakeDetails!: Record<string, unknown>;
}
