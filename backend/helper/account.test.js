const { appendAccountInfo, recordLogin } = require("./account");

const fakeUser = (values) => ({ ...values, dataValues: {}, save: vi.fn() });

describe("recordLogin", () => {
  test("a first login has no last login", async () => {
    const user = fakeUser();

    await recordLogin(user, "password");

    expect(user.currentLoginAt).toBeInstanceOf(Date);
    expect(user.currentLoginMethod).toBe("password");
    expect(user.lastLoginAt).toBeUndefined();
    expect(user.save).toHaveBeenCalledOnce();
  });

  test("the login it replaces becomes the last login", async () => {
    const firstLoginAt = new Date("2020-01-01T12:00:00Z");
    const user = fakeUser({
      currentLoginAt: firstLoginAt,
      currentLoginMethod: "password",
    });

    await recordLogin(user, "Google");

    expect(user.lastLoginAt).toBe(firstLoginAt);
    expect(user.lastLoginMethod).toBe("password");
    expect(user.currentLoginAt.getTime()).toBeGreaterThan(
      firstLoginAt.getTime(),
    );
    expect(user.currentLoginMethod).toBe("Google");
  });
});

describe("appendAccountInfo", () => {
  test("password account that never logged in since tracking began", () => {
    const user = fakeUser({ password: "hash" });

    appendAccountInfo(user);

    expect(user.dataValues).toEqual({
      authProvider: null,
      currentLogin: null,
      lastLogin: null,
    });
  });

  test("third-party account with a previous login", () => {
    const at = new Date("2020-01-01T12:00:00Z");
    const user = fakeUser({
      authSubject: "abc",
      currentLoginAt: new Date(),
      currentLoginMethod: "Google",
      lastLoginAt: at,
      lastLoginMethod: "password",
    });

    appendAccountInfo(user);

    expect(user.dataValues.authProvider).toEqual(expect.any(String));
    expect(user.dataValues.currentLogin.method).toBe("Google");
    expect(user.dataValues.lastLogin).toEqual({ at, method: "password" });
  });
});
