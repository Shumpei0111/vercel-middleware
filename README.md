# Next.js Middleware 1

このプロジェクトは、Next.js におけるカスタムミドルウェアの実装を目的としています。ミドルウェアチェーンを活用して、リクエスト処理の各段階で特定のロジックを実行します。現在、リクエストのロギングと基本的な認証機能が実装されています。

## Middleware Chain

MiddlewareChain クラスは、複数のミドルウェアルールを順番に実行するためのチェーンを構築します。各ミドルウェアはリクエストを処理し、必要に応じて次のミドルウェアに処理を委譲します。

```ts
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
```

このクラスは、ミドルウェアの配列を受け取り、`handle` メソッドを通じてリクエストを順次処理します。各ミドルウェアは `process` メソッドを実装し、必要に応じてリクエストを変更したり、レスポンスを返したりします。

## Middleware Rule

MiddlewareRule は、各ミドルウェアが従うべきインターフェースを定義します。このインターフェースを実装することで、新しいミドルウェアを簡単に追加できます。

```ts
import { NextRequest, NextResponse } from "next/server";

export interface MiddlewareRule {
  process(
    req: NextRequest,
    next: () => NextResponse | Promise<NextResponse>
  ): NextResponse | Promise<NextResponse>;
}
```

このインターフェースは、`process` メソッドを定義します。このメソッドは、リクエストと次のミドルウェアを処理するためのコールバックを受け取り、レスポンスを返します。

### Logger middleware

Logger クラスは、リクエストのメソッドとパスをコンソールにログ出力するミドルウェアです。デバッグやモニタリングに役立ちます。

```ts
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
```

### BasicAuth middleware

BasicAuth クラスは、基本認証を実装するミドルウェアです。リクエストに有効な認証情報が含まれていない場合、`401 Unauthorized` のレスポンスを返します。

```ts
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
```

**※ 環境変数は t3-env で管理したオブジェクトを使用しています**

## Test

### Middleware Chain Test

MiddlewareChain の動作を検証するために、Vitest を使用したテストが実装されています。middlewareChain.test.ts ファイルでは、ミドルウェアチェーンにカスタムミドルウェアを追加し、正しく動作することを確認しています。

```ts
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
    expect(response.headers.get("x-test")).toBe("test");
  });
});
```

### BasicAuth Test

BasicAuth の動作を検証するために、Vitest を使用したテストが実装されています。basicAuth.test.ts ファイルでは、有効な認証情報と無効な認証情報の場合の動作を確認しています。

```ts
import { describe, it, expect, vi } from "vitest";
import { BasicAuth } from "./basic-auth";
import { NextRequest, NextResponse } from "next/server";

describe("BasicAuth Middleware", () => {
  it("should return 401 if no authorization header is present", () => {
    const req = new NextRequest("http://localhost:3000/");
    const middleware = new BasicAuth();
    const response = middleware.process(req, () => NextResponse.next());
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      "Basic realm=Authorization Required"
    );
  });

  it("should return 401 if credentials are invalid", () => {
    const credentials = Buffer.from("invalid:credentials").toString("base64");
    const req = new NextRequest("http://localhost:3000/", {
      headers: { authorization: `Basic ${credentials}` },
    });
    const middleware = new BasicAuth();
    const response = middleware.process(req, () => NextResponse.next());
    expect(response.status).toBe(401);
  });

  it("should call next() if credentials are valid", () => {
    process.env.BASIC_AUTH_USERNAME = "admin";
    process.env.BASIC_AUTH_PASSWORD = "password";
    const credentials = Buffer.from("admin:password").toString("base64");
    const req = new NextRequest("http://localhost:3000/", {
      headers: { authorization: `Basic ${credentials}` },
    });
    const middleware = new BasicAuth();
    const nextMock = vi.fn(() => NextResponse.next());
    const response = middleware.process(req, nextMock);
    expect(nextMock).toHaveBeenCalled();
    expect(response).toEqual(NextResponse.next());
  });
});
```

**環境変数を process.env で確認する必要があります**

## How to append middleware

**1. create some middleware**

```ts
// src/middleware/customMiddleware.ts
import { NextRequest, NextResponse } from "next/server";
import { MiddlewareRule } from "./middlewareRule.type";

export class CustomMiddleware implements MiddlewareRule {
  process(req: NextRequest, next: () => NextResponse): NextResponse {
    // カスタム処理をここに追加
    console.log("[CustomMiddleware] カスタムミドルウェアが実行されました");
    return next();
  }
}
```

**2. append middleware to middleware chain**

```ts
// src/middleware.ts
import { NextRequest } from "next/server";
import { MiddlewareChain } from "./middleware/middlewareChain";
import { Logger } from "./middleware/logger";
import { BasicAuth } from "./middleware/basic-auth";
import { CustomMiddleware } from "./middleware/customMiddleware";

const middlewareChain = new MiddlewareChain([
  new Logger(),
  new BasicAuth(),
  new CustomMiddleware(), // append new middleware
]);

export default function middleware(req: NextRequest) {
  return middlewareChain.handle(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Last

このプロジェクトでは、Next.js のミドルウェア機能を利用して、リクエスト処理の各段階でカスタムロジックを実行する柔軟なミドルウェアチェーンを構築しています。`MiddlewareChain` クラスと `MiddlewareRule` インターフェースを活用することで、新しいミドルウェアの追加や既存のミドルウェアの管理が容易になります。

### Points

- MiddlewareChain: ミドルウェアの順序を管理し、リクエストを順次処理します。
- MiddlewareRule: 各ミドルウェアが実装すべきインターフェースを定義します。
- Logger: リクエストのメソッドとパスをログ出力します。
- BasicAuth: 基本認証を実装し、不正なリクエストを遮断します。
- テスト: Vitest を利用してミドルウェアの動作を検証します。
- 将来的には、認証以外の機能（例: レスポンスのキャッシュ、リクエストのバリデーションなど）を持つ新しいミドルウェアを追加することで、プロジェクトの機能を拡張することができます。
