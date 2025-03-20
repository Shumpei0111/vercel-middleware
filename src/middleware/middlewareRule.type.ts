import { NextRequest, NextResponse } from "next/server";

export interface MiddlewareRule {
  process(
    req: NextRequest,
    next: () => NextResponse | Promise<NextResponse>
  ): NextResponse | Promise<NextResponse>;
}
