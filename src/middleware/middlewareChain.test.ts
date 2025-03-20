import { describe, it, expect } from "vitest";
import { MiddlewareChain } from "@/middleware/middlewareChain";
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareRule } from "@/middleware/middlewareRule.type";

class TestMiddleware implements MiddlewareRule {
  async process(
    _: NextRequest,
    next: () => NextResponse
  ): Promise<NextResponse> {
    const response = await next();
    response.headers.set("x-test", "test");
    return response;
  }
}

describe("MiddlewareChain", () => {
  it("should add a header to the request", async () => {
    const chain = new MiddlewareChain([new TestMiddleware()]);
    const req = new NextRequest("http://localhost:3000/test");
    const response = await chain.handle(req);
    // console.log("🍏", response);
    expect(response.headers.get("x-test")).toBe("test");
  });
});
