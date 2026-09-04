import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMonthGrid,
  formatCalendarDayHeading,
  formatCalendarMonthYear,
  getCalendarWeekdayLabels,
  isSameLocalDay,
} from "./calendar-dates";

describe("formatCalendarMonthYear", () => {
  it("formats month and year in en-GB", () => {
    const date = new Date(2021, 2, 15);
    assert.equal(formatCalendarMonthYear(date), "March 2021");
  });
});

describe("formatCalendarDayHeading", () => {
  it("formats a full weekday heading", () => {
    const date = new Date(2026, 2, 15);
    assert.equal(formatCalendarDayHeading(date), "Sunday, 15 March 2026");
  });
});

describe("getCalendarWeekdayLabels", () => {
  it("starts on Sunday", () => {
    assert.deepEqual(getCalendarWeekdayLabels(), [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
  });
});

describe("isSameLocalDay", () => {
  it("matches dates on the same local day", () => {
    const a = new Date(2026, 8, 1, 9, 0, 0);
    const b = new Date(2026, 8, 1, 23, 59, 59);

    assert.equal(isSameLocalDay(a, b), true);
  });

  it("does not match different local days", () => {
    const a = new Date(2026, 8, 1, 23, 59, 59);
    const b = new Date(2026, 8, 2, 0, 0, 0);

    assert.equal(isSameLocalDay(a, b), false);
  });
});

describe("buildMonthGrid", () => {
  it("builds March 2021 with leading and trailing days", () => {
    const grid = buildMonthGrid(2021, 2);

    assert.equal(grid.length % 7, 0);
    assert.equal(grid.length >= 35, true);
    assert.equal(grid[0].dateKey, "2021-02-28");
    assert.equal(
      grid.find((day) => day.dateKey === "2021-03-01")?.inCurrentMonth,
      true
    );
    assert.equal(
      grid.find((day) => day.dateKey === "2021-02-28")?.inCurrentMonth,
      false
    );
  });

  it("covers six weeks when needed", () => {
    const grid = buildMonthGrid(2026, 4);

    assert.equal(grid.length, 42);
    assert.equal(grid[0].dateKey, "2026-04-26");
    assert.equal(grid.at(-1)?.dateKey, "2026-06-06");
  });
});
