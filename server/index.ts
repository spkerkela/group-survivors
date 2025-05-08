import { host, port } from "./config";
import server from "./server";

const start = server({ host, port });

const stop = start();
