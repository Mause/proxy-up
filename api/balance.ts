import { Configuration, AccountsApi } from "../src/up";
import { IsNumber, IsString } from "class-validator";
import { VercelRequest, VercelResponse } from "@vercel/node";

const accountsApi = new AccountsApi(
  new Configuration({
    accessToken: process.env.UP_TOKEN,
  })
);

class Shape {
  @IsNumber()
  valueInBaseUnits!: number;
  @IsString()
  value!: string;
}

export const responseShape = Shape.name;

export default async function (req: VercelRequest, res: VercelResponse) {
  const accounts = await accountsApi.accountsGet();
  res.json(
    accounts.data.data.map((account) => {
      return [account.attributes.displayName, account.attributes.balance];
    })
  );
}
