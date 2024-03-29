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
import _ from "lodash";
import { log } from "../support/log";

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
    const requestUrl = getRequestUrl(request);
    log.info({ requestUrl });

    const { query } = request;
    const includeNegative = query.includeNegative === "true";
    log.info({
      query,
      includeNegative,
    });

    const res: ListTransactionsResponse = (
      await transactionsApi.transactionsGet(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { params: _.pick(request.query, ["page[after]", "page[size]"]) }
      )
    ).data;

    requestUrl.search = new URL(res.links.next!).search;
    requestUrl.searchParams.set('includeNegative', includeNegative.toString());
    const next = requestUrl.toString();
    log.info({ next }, "Next url generated");

    response.status(200);
    let transactions = res.data;

    if (!includeNegative) {
      transactions = transactions.filter(
        (trans) =>
          trans.attributes.amount.valueInBaseUnits > 0 &&
          trans.attributes.rawText
      );
    }

    response.json(
      new UpTransactionResponse(
        transactions
          .map((row) => ({
            id: row.id,
            attributes: { ...row.attributes, message: row.attributes.message! },
          })),
        { next }
      )
    );
  }
);

function getRequestUrl(request: VercelRequest) {
  const requestUrl = new URL(request.url!, "https://dummy");
  const headers = request.headers as { [key: string]: string };
  requestUrl.protocol = headers["x-forwarded-proto"];
  requestUrl.host = headers["x-forwarded-host"];
  requestUrl.port = headers["x-forwarded-port"];
  return requestUrl;
}
