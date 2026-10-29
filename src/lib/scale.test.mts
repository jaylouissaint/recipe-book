import assert from "node:assert/strict";
import { test } from "node:test";
import { readAmount, scaleQuantity, writeAmount } from "./scale.ts";

test("reading amounts as cooks write them", () => {
  assert.equal(readAmount("2"), 2);
  assert.equal(readAmount("1/3"), 1 / 3);
  assert.equal(readAmount("1 1/2"), 1.5);
  assert.equal(readAmount("½"), 0.5);
  assert.equal(readAmount("1½"), 1.5);
  assert.equal(readAmount("1 ½"), 1.5);
  assert.equal(readAmount("1.5"), 1.5);
  assert.equal(readAmount("a few"), null);
  assert.equal(readAmount("1/0"), null);
});

test("writing amounts back with kitchen fractions", () => {
  assert.equal(writeAmount(2), "2");
  assert.equal(writeAmount(1.5), "1 1/2");
  assert.equal(writeAmount(1 / 3), "1/3");
  assert.equal(writeAmount(2 / 3), "2/3");
  assert.equal(writeAmount(0.25), "1/4");
  assert.equal(writeAmount(2.999), "3");
  assert.equal(writeAmount(0.6), "0.6");
  assert.equal(writeAmount(2.4), "2.4");
});

test("scaling the sweet chili chicken from 4 to 6 servings", () => {
  const f = 6 / 4;
  assert.equal(scaleQuantity("2", f), "3");
  assert.equal(scaleQuantity("1/3", f), "1/2");
  assert.equal(scaleQuantity("1", f), "1 1/2");
  assert.equal(scaleQuantity("1/2", f), "3/4");
  assert.equal(scaleQuantity("", f), "");
  assert.equal(scaleQuantity("2-3", f), "3-4 1/2");
  assert.equal(scaleQuantity("a few", f), "a few");
  assert.equal(scaleQuantity("1/3", 1), "1/3");
});

test("halving", () => {
  assert.equal(scaleQuantity("1/3", 0.5), "1/6");
  assert.equal(scaleQuantity("3", 0.5), "1 1/2");
  assert.equal(scaleQuantity("1 1/2", 0.5), "3/4");
});
