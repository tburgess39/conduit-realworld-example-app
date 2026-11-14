import dateTimeFormatter from "./dateTimeFormatter";

it("should format a date with its time", () => {
  const localDate = new Date(2020, 0, 1, 15, 4);
  // The separators around the time vary with the runtime's locale data
  const expected = /^January 1, 2020.+3:04\sPM$/;

  expect(dateTimeFormatter(localDate)).toMatch(expected);
  expect(dateTimeFormatter(localDate.toISOString())).toMatch(expected);
});
