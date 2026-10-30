import assert from "node:assert/strict";
import { test } from "node:test";
import { bookPath, fromPath, isBook } from "./books.ts";

test("each book's addresses", () => {
  assert.equal(bookPath("ramiya", "/library"), "/library");
  assert.equal(bookPath("jay", "/library"), "/jay/library");
  assert.equal(bookPath("jay", "/"), "/jay");
  assert.equal(bookPath("jay", "/recipe/banana-bread?scale=2"), "/jay/recipe/banana-bread?scale=2");
  assert.deepEqual(fromPath("/jay/recipe/x"), { book: "jay", path: "/recipe/x" });
  assert.deepEqual(fromPath("/jay"), { book: "jay", path: "/" });
  assert.deepEqual(fromPath("/jaywalking"), { book: "ramiya", path: "/jaywalking" });
  assert.deepEqual(fromPath("/groceries"), { book: "ramiya", path: "/groceries" });
  assert.deepEqual(fromPath("/b/jay/library"), { book: "jay", path: "/library" });
  assert.deepEqual(fromPath("/b/ramiya"), { book: "ramiya", path: "/" });
  assert.ok(isBook("jay") && !isBook("bob") && !isBook(undefined));
});
