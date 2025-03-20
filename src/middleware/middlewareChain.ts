import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareRule } from "./middlewareRule.type";

export class MiddlewareChain {
  private rules: MiddlewareRule[];

  constructor(rules: MiddlewareRule[]) {
    this.rules = rules;
  }

  handle(req: NextRequest): NextResponse | Promise<NextResponse> {
    let index = 0;

    const next = (): NextResponse | Promise<NextResponse> => {
      if (index < this.rules.length) {
        const rule = this.rules[index++];
        return rule.process(req, next);
      }

      return NextResponse.next();
    };

    return next();
  }
}
