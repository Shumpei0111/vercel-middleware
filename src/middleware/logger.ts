import { NextRequest, NextResponse } from "next/server";
import { MiddlewareRule } from "./middlewareRule.type";

export class Logger implements MiddlewareRule {
  process(
    req: NextRequest,
    next: () => NextResponse | Promise<NextResponse>
  ): NextResponse | Promise<NextResponse> {
    console.log(`[Logger] ${req.method} ${req.nextUrl.pathname}`);
    return next();
  }
}
