import "dotenv/config";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { getLocalIp } from "./config/network.js";

const app = createApp();

app.listen(env.PORT, () => {
  const ip = getLocalIp();
  console.log(`Server running on http://${ip}:${env.PORT}`);
});

