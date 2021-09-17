import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  IsDate,
  IsString,
  ValidateNested,
  IsNumber,
  IsUrl,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import Axios from "axios";
import {
  Configuration,
  ListTransactionsResponse,
  TransactionsApi,
} from "../src/up";
import authenticate from "../src/authenticate";
import { URL } from "url";
import { BASE_PATH } from "../src/up/base";
import pino from "pino";

const log = pino({ prettyPrint: true });

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

class UpLinks {
  @IsUrl()
  @IsOptional()
  next: string | null;

  constructor(next: string | null) {
    this.next = next;
  }
}

class UpTransactionResponse {
  @ValidateNested({ each: true })
  @Type(() => UpTransaction)
  public items: UpTransaction[];
  @ValidateNested()
  @Type(() => UpLinks)
  public links: UpLinks;
  constructor(items: UpTransaction[], links: UpLinks) {
    this.items = items;
    this.links = links;
  }
}
export const responseShape = UpTransactionResponse.name;

class Amount {
  @IsNumber()
  valueInBaseUnits!: number;
  @IsString()
  value!: string;
}

export const axiosUp = Axios.create();
const transactionsApi = new TransactionsApi(
  new Configuration({
    accessToken: process.env.UP_TOKEN,
  }),
  BASE_PATH,
  axiosUp
);

export default authenticate(
  async (request: VercelRequest, response: VercelResponse) => {
    const pageAfter = "page[after]";
    let pageAfterValue = request.query[pageAfter] as string | null;
    log.info({ pageAfterValue }, "Got request");

    let res: ListTransactionsResponse = (
      await transactionsApi.transactionsGet(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          [pageAfter]: pageAfterValue,
        }
      )
    ).data;

    pageAfterValue = new URLSearchParams(new URL(res.links.next!).search).get(
      pageAfter
    );
    const next = request.url + `?${pageAfter}=` + pageAfterValue;
    log.info({ next }, "Next url generated");

    response.status(200);
    response.json(
      new UpTransactionResponse(
        res.data
          .filter(
            (trans) =>
              trans.attributes.amount.valueInBaseUnits > 0 &&
              trans.attributes.rawText
          )
          .map((row) => ({
            id: row.id,
            attributes: { ...row.attributes, message: row.attributes.message! },
          })),
        { next }
      )
    );
  }
);
