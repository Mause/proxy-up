import { createServer } from "vercel-node-server";
import listen from "test-listen";
import axios from "axios";
import { Server } from "net";
import moxios from "moxios";
import { sign } from "jsonwebtoken";

let server: Server;
let url: string;

const SECRET = "SECRET";
process.env.JWT_SECRET = SECRET;

beforeAll(async () => {
  const { axios: axiosUp } = require("../api/up");
  const routeUnderTest = require("../api/up");
  server = createServer(routeUnderTest.default);
  url = await listen(server);
  moxios.install(axiosUp);
});

afterAll(() => {
  const { axios: axiosUp } = require("../api/up");
  server.close();
  moxios.uninstall(axiosUp);
});

it("should return the expected response", async () => {
  moxios.stubOnce("GET", /.*/, {
    status: 200,
    response: {
      data: [
        {
          attributes: {
            amount: { valueInBaseUnits: 1500 },
            rawText: "Internet bill",
          },
        },
      ],
      links: {
        next: "https://up/next",
      },
    },
  });
  const response = await axios.get(url, {
    headers: {
      Authorization: "Bearer " + sign({ aud: "authenticated" }, SECRET),
    },
  });
  expect(response.status).toBe(200);
  expect(response.data).toMatchSnapshot();
});
