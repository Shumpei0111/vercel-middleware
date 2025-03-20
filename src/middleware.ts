import { NextRequest } from "next/server";
import { MiddlewareChain } from "./middleware/middlewareChain";
import { Logger } from "./middleware/logger";
import { BasicAuth } from "./middleware/basic-auth";

const middlewareChain = new MiddlewareChain([new Logger(), new BasicAuth()]);

export default function middleware(req: NextRequest) {
  return middlewareChain.handle(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
