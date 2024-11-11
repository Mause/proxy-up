import { Configuration, AccountsApi } from "../src/up";
import { IsNumber, IsString } from "class-validator";
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

export const responseShape = Shape.name;

export default async function (req: VercelRequest, res: VercelResponse) {
  const accounts = await accountsApi.accountsGet();
  res.json(
    accounts.data.data.map(({ attributes }): Shape => {
      return {
        id: attributes.id,
        displayName: attributes.displayName,
        balance: attributes.balance,
      };
    })
  );
}
