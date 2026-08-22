import type { IntlShape } from "react-intl";
import { normalizeDomainTarget } from "@/client/features/domain/utils";
import { createFormValidationErrors } from "@/client/lib/forms";
import type { DomainControlsValues } from "@/client/features/domain/types";

export function getDomainSearchValidationErrors(
  value: DomainControlsValues,
  intl: IntlShape,
) {
  if (!value.domain.trim()) {
    return createFormValidationErrors({
      fields: {
        domain: intl.formatMessage({
          id: "domainOverview.search.validation.domainRequired",
        }),
      },
    });
  }

  if (!normalizeDomainTarget(value.domain)) {
    return createFormValidationErrors({
      fields: {
        domain: intl.formatMessage({
          id: "domainOverview.search.validation.domainInvalid",
        }),
      },
    });
  }

  return null;
}

export function getDomainSearchChangeValidationErrors(
  value: DomainControlsValues,
  shouldValidateUntouchedField: boolean,
  shouldValidateFormat: boolean,
  intl: IntlShape,
) {
  if (!value.domain.trim()) {
    if (!shouldValidateUntouchedField) {
      return null;
    }

    return createFormValidationErrors({
      fields: {
        domain: intl.formatMessage({
          id: "domainOverview.search.validation.domainRequired",
        }),
      },
    });
  }

  if (!shouldValidateFormat) {
    return null;
  }

  return getDomainSearchValidationErrors(value, intl);
}
