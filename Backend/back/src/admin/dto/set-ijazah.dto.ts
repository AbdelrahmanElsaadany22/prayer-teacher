import { IsBoolean } from 'class-validator';

export class SetIjazahDto {
  /** true grants the Al-Fatiha ijazah, false revokes it. */
  @IsBoolean()
  granted!: boolean;
}
