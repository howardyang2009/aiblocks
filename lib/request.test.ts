import { describe, it, expect } from "vitest";
import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "@/lib/request";

function fakeReq(json: () => Promise<unknown>): NextRequest {
  return { json } as unknown as NextRequest;
}

describe("parseBody", () => {
  it("returns the parsed JSON body", async () => {
    expect(await parseBody(fakeReq(async () => ({ a: 1 })))).toEqual({ a: 1 });
  });

  it("400s an unparseable body with the invalidBody key", async () => {
    const res = await parseBody(
      fakeReq(async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      })
    );

    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(400);
    expect(await (res as NextResponse).json()).toEqual({ error: "invalidBody" });
  });
});
