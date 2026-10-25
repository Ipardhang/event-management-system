import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import { updateProfile } from "../src/controllers/authController.js";
import app from "../src/app.js";

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

const account = { _id: "507f1f77bcf86cd799439011", name: "Existing User", email: "existing@example.test", role: "attendee" };

test("profile updates require authentication", async () => {
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Name", email: account.email }) });
    assert.equal(result.status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("updates only the authenticated user's name and email", async (t) => {
  t.mock.method(User, "findByIdAndUpdate", async (id, update) => {
    assert.equal(id, account._id);
    assert.deepEqual(update, { $set: { name: "New Name", email: account.email } });
    return { ...account, ...update.$set, password: "must-not-leak" };
  });
  const res = response();
  await updateProfile({ user: account, body: { name: " New Name ", email: " EXISTING@example.test ", role: "admin", password: "ignored", _id: "someone-else" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.user.role, "attendee");
  assert.equal(res.body.user.password, undefined);
});

test("rejects invalid or missing profile fields before database writes", async (t) => {
  const write = t.mock.method(User, "findByIdAndUpdate", () => assert.fail("Unexpected database write"));
  for (const body of [undefined, { name: "A", email: account.email }, { name: "Valid Name", email: "bad" }, { name: "Valid Name", email: { $ne: null } }]) {
    const res = response();
    await updateProfile({ user: account, body }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(write.mock.callCount(), 0);
});

test("email changes require the current password and normalize email", async (t) => {
  const password = "test-only-password";
  const hash = await bcrypt.hash(password, 4);
  t.mock.method(User, "findById", () => ({ select: async () => ({ ...account, password: hash }) }));
  const write = t.mock.method(User, "findByIdAndUpdate", async (id, update) => ({ ...account, ...update.$set }));
  for (const currentPassword of [undefined, "incorrect"]) {
    const res = response();
    await updateProfile({ user: account, body: { name: account.name, email: "new@example.test", currentPassword } }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(write.mock.callCount(), 0);
  const res = response();
  await updateProfile({ user: account, body: { name: account.name, email: " NEW@example.test ", currentPassword: password } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.user.email, "new@example.test");
});

test("duplicate emails return a helpful conflict error", async (t) => {
  t.mock.method(User, "findByIdAndUpdate", async () => { throw Object.assign(new Error("Duplicate"), { code: 11000 }); });
  const res = response();
  await updateProfile({ user: account, body: { name: "New Name", email: account.email } }, res);
  assert.equal(res.code, 409);
  assert.match(res.body.message, /already registered/);
});
