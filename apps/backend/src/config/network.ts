import os from "node:os";

export function getLocalIp(): string {
  const ifaces = os.networkInterfaces();
  for (const infos of Object.values(ifaces)) {
    if (!infos) continue;
    for (const info of infos) {
      if (info.family === "IPv4" && !info.internal) return info.address;
    }
  }
  return "127.0.0.1";
}

