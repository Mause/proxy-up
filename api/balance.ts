import { Configuration, AccountsApi } from "../src/up";
import { IsNumber, IsString, IsArray, ValidateNested } from "class-validator";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { Type } from "class-transformer";

const accountsApi = new AccountsApi(
  new Configuration({
    accessToken: process.env.UP_TOKEN,
  })
);

class Shape {
  @IsString()
  id!: string;
  @IsString()
  displayName!: string;
  @Type(() => Money)
  balance!: Money;
}

class Money {
  @IsNumber()
  valueInBaseUnits!: number;
  @IsString()
  value!: string;
}

class ResponseShape {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Shape)
  data!: Shape[];
}

export const responseShape = ResponseShape.name;

export default async function (req: VercelRequest, res: VercelResponse) {
  const accounts = await accountsApi.accountsGet();
  const response: ResponseShape = {
    data: accounts.data.data.map(({ id, attributes }): Shape => {
      return {
        id,
        displayName: attributes.displayName,
        balance: attributes.balance,
      };
    }),
  };
  res.json(response);
}
