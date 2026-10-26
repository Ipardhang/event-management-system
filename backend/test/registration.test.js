import test from "node:test";
import assert from "node:assert/strict";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import { registerForEvent } from "../src/controllers/registrationController.js";

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("booking quantity must be between 1 and 10", async (t) => {
  const findOne = t.mock.method(Registration, "findOne", () => assert.fail("Unexpected database read"));
  const update = t.mock.method(Event, "findOneAndUpdate", () => assert.fail("Unexpected event update"));
  for (const quantity of [0, 11, 1.5, "many"]) {
    const res = response();
    await registerForEvent({ user: { _id: "user-id" }, params: { id: "event-id" }, body: { quantity } }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(findOne.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test("booking stores quantity and calculates 18 percent GST", async (t) => {
  t.mock.method(Registration, "findOne", async () => null);
  t.mock.method(Event, "findOneAndUpdate", async (filter, update) => {
    assert.deepEqual(filter, { _id: "event-id", status: "approved", availableSeats: { $gte: 3 } });
    assert.deepEqual(update, { $inc: { availableSeats: -3 } });
    return { _id: "event-id", ticketPrice: 100 };
  });
  t.mock.method(Registration, "create", async (document) => {
    assert.equal(document.quantity, 3);
    assert.equal(document.unitPrice, 100);
    assert.equal(document.subtotal, 300);
    assert.equal(document.gstAmount, 54);
    assert.equal(document.totalAmount, 354);
    return document;
  });
  const res = response();
  await registerForEvent({ user: { _id: "user-id" }, params: { id: "event-id" }, body: { quantity: 3 } }, res);
  assert.equal(res.code, 201);
  assert.deepEqual(res.body.pricing, { quantity: 3, subtotal: 300, gstAmount: 54, totalAmount: 354, gstRate: 18 });
});
