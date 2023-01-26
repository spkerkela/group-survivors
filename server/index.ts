import server from "./server";
import { host, port } from "./config";

const start = server({ host, port });

const stop = start();
