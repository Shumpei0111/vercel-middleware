import { NextRequest, NextResponse } from "next/server";
import { MiddlewareRule } from "./middlewareRule.type";
import { env } from "@/env.mjs";

export class BasicAuth implements MiddlewareRule {
  process(req: NextRequest, next: () => NextResponse): NextResponse {
    const authHeader = req.headers.get("authorization") ?? "";

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": "Basic realm=Authorization Required",
          "Cache-Control": "no-store",
          "Content-Type": "text/plain;charset=UTF-8",
        },
      });
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");

    if (
      username !== env.BASIC_AUTH_USERNAME ||
      password !== env.BASIC_AUTH_PASSWORD
    ) {
      console.log("[BasicAuth] Invalid credentials");
      return NextResponse.json("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": "Basic realm=Authorization Required",
          "Cache-Control": "no-store",
          "Content-Type": "text/plain;charset=UTF-8",
        },
      });
    }

    console.log("[BasicAuth] Authentication successful");
    return next();
  }
}
