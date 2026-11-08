'use client';

import { createContext } from 'react';

// Private views keep overlays inside the same concealed/inert boundary.
export const PortalContainer = createContext<HTMLElement | undefined>(undefined);
export const PortalConcealed = createContext(false);
