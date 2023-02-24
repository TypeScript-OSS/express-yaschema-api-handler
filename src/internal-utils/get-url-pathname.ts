import { getUrlBaseForRouteType } from 'yaschema-api';

/** Gets the complete pathname, relative, if applicable, to the configuring URL base associated with the specified route type, for the
 * specified relative or absolute URL */
export const getUrlPathnameUsingRouteType = (routeType: string, url: string) => {
  // Removing any trailing / because getUrlPathname always starts with /
  const base = getUrlPathname(getUrlBaseForRouteType(routeType)).replace(/\/$/g, '');
  return base + getUrlPathname(url);
};

/** Gets the pathname for a relative or absolute URL */
export const getUrlPathname = (url: string) => {
  const pathname = new URL(url, 'http://localhost').pathname;
  return decodeURIComponent(pathname);
};
