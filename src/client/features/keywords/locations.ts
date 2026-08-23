// Location data lives in shared/ so the server can route keyword research by
// provider (Labs vs Google Ads). This shim keeps existing client imports.
export {
  DEFAULT_LOCATION_CODE,
  LABS_LOCATION_OPTIONS,
  LOCATIONS,
  SERP_LANGUAGE_OPTIONS,
  getLanguageCode,
  isLabsLocationCode,
  isSupportedLocationCode,
} from "@/shared/keyword-locations";
