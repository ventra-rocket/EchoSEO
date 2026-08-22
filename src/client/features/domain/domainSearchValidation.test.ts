import { createIntl } from "react-intl";
import { describe, expect, it } from "vitest";
import {
  getDomainSearchChangeValidationErrors,
  getDomainSearchValidationErrors,
} from "./domainSearchValidation";
import { MESSAGES } from "@/client/i18n/messages";
import type { DomainControlsValues } from "@/client/features/domain/types";

const BASE_VALUE: DomainControlsValues = {
  domain: "",
  subdomains: true,
  sort: "traffic",
  locationCode: 2840,
};

describe("getDomainSearchValidationErrors", () => {
  it("localizes the empty-domain error", () => {
    const intl = createIntl({ locale: "vi", messages: MESSAGES.vi });
    const errors = getDomainSearchValidationErrors(BASE_VALUE, intl);
    expect(errors?.fields?.domain).toBe("Vui lòng nhập tên miền");
  });

  it("localizes the invalid-domain error", () => {
    const intl = createIntl({ locale: "vi", messages: MESSAGES.vi });
    const errors = getDomainSearchValidationErrors(
      { ...BASE_VALUE, domain: "notadomain" },
      intl,
    );
    expect(errors?.fields?.domain).toBe(
      "Vui lòng nhập URL hoặc tên miền hợp lệ (vd: example.com)",
    );
  });

  it("passes a valid domain through in English", () => {
    const intl = createIntl({ locale: "en", messages: MESSAGES.en });
    expect(
      getDomainSearchValidationErrors(
        { ...BASE_VALUE, domain: "example.com" },
        intl,
      ),
    ).toBeNull();
  });
});

describe("getDomainSearchChangeValidationErrors", () => {
  it("stays silent on an untouched empty field", () => {
    const intl = createIntl({ locale: "vi", messages: MESSAGES.vi });
    expect(
      getDomainSearchChangeValidationErrors(BASE_VALUE, false, false, intl),
    ).toBeNull();
  });

  it("localizes the empty-domain error once the field is touched", () => {
    const intl = createIntl({ locale: "vi", messages: MESSAGES.vi });
    const errors = getDomainSearchChangeValidationErrors(
      BASE_VALUE,
      true,
      false,
      intl,
    );
    expect(errors?.fields?.domain).toBe("Vui lòng nhập tên miền");
  });

  it("delegates to format validation once the form has been submitted", () => {
    const intl = createIntl({ locale: "vi", messages: MESSAGES.vi });
    const errors = getDomainSearchChangeValidationErrors(
      { ...BASE_VALUE, domain: "notadomain" },
      true,
      true,
      intl,
    );
    expect(errors?.fields?.domain).toBe(
      "Vui lòng nhập URL hoặc tên miền hợp lệ (vd: example.com)",
    );
  });
});
