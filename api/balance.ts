import {
  Configuration,
  ListTransactionsResponse,
  TransactionsApi,
} from "../src/up";
import { IsNumber, IsString } from 'class-validator';

class Shape {
    @IsNumber()
  valueInBaseUnits!: number;
  @IsString()
  value!: string;
}

export const responseShape = Shape.name;

export default function () {
  return 'get the balance right';
}
