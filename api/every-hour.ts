import {
  CategoriesApi,
  CategoryResource,
  TransactionsApi,
} from "../src/up/api";
import { Configuration } from "../src/up/configuration";
import { VercelRequest, VercelResponse } from "@vercel/node";

const configuration = new Configuration({
  accessToken: process.env.UP_ACCESS_TOKEN,
});

const transactionsApi = new TransactionsApi(configuration);

const categoriesApi = new CategoriesApi(configuration);

async function rollupCategory(category: CategoryResource) {
  console.log(category);
  const transactions = await transactionsApi.transactionsGet(
    undefined,
    undefined,
    undefined,
    undefined,
    category.id
  );

  return [
    category.attributes.name,
    transactions.data.data.reduce((acc, transaction) => {
      return acc + transaction.attributes.amount.valueInBaseUnits;
    }, 0),
  ];
}

export default async function (req: VercelRequest, res: VercelResponse) {
  const categories = await categoriesApi.categoriesGet();

  const rollup: Record<string, number> = Object.fromEntries(
    await Promise.all(categories.data.data.map(rollupCategory))
  );

  res.status(200).json({ rollup, categories });
}
