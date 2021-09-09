import { VercelRequest, VercelResponse } from "@vercel/node";
import { IsArray, IsDate, IsNotEmptyObject, IsString, Type, ValidateNested } from "class-validator";
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
  @IsNotEmptyObject()
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
  @IsNotEmptyObject()
  @Type(() => UpAttributes)
  attributes!: UpAttributes;
}

class UpTransactionResponse {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpTransaction)
  public items: UpTransaction[];
  constructor(items: UpTransaction[]) {
    this.items = items;
  }
}
export const responseShape = UpTransactionResponse.name;

interface Amount {
  valueInBaseUnits: number;
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
