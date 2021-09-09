import { VercelRequest, VercelResponse } from "@vercel/node";
import { IsDate, IsString, ValidateNested, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import {
  Configuration,
  ListTransactionsResponse,
  TransactionsApi,
} from "../src/up";
import authenticate from "../src/authenticate";

class UpAttributes {
  @IsString()
  description: string;
  @IsString()
  message: string;
  @IsDate()
  createdAt: string;
  @ValidateNested()
  @Type(() => Amount)
  amount: Amount;

  constructor(
    description: string,
    message: string,
    createdAt: string,
    amount: Amount
  ) {
    this.description = description;
    this.message = message;
    this.createdAt = createdAt;
    this.amount = amount;
  }
}

class UpTransaction {
  @IsString()
  id!: string;
  @ValidateNested()
  @Type(() => UpAttributes)
  attributes!: UpAttributes;
}

class UpTransactionResponse {
  @ValidateNested({ each: true })
  @Type(() => UpTransaction)
  public items: UpTransaction[];
  constructor(items: UpTransaction[]) {
    this.items = items;
  }
}
export const responseShape = UpTransactionResponse.name;

class Amount {
  @IsNumber()
  valueInBaseUnits!: number;
  @IsString()
  value: string;
}

const transactionsApi = new TransactionsApi(
  new Configuration({
    apiKey: process.env.UP_TOKEN,
  })
);

export default authenticate(
  async (request: VercelRequest, response: VercelResponse) => {
    const transactions = [];
    let i = 10;

    let pageAfter = undefined;
    while (i > 0) {
      console.log(i);
      let res: ListTransactionsResponse = (
        await transactionsApi.transactionsGet(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            "page[after]": pageAfter,
          }
        )
      ).data;
      transactions.push(...res.data);
      pageAfter = res.links.next!;
      console.log(pageAfter, res.links);
      i--;
    }

    response.status(200);
    response.json(
      new UpTransactionResponse(
        transactions
          .filter(
            (trans) =>
              trans.attributes.amount.valueInBaseUnits > 0 &&
              trans.attributes.rawText
          )
          .map((row) => ({
            id: row.id,
            attributes: { ...row.attributes, message: row.attributes.message! },
          }))
      )
    );
  }
);
