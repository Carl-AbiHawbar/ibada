'use client';

import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        // Full navigation: this runs outside React, where the router hook isn't available.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/admin/two-factor');
      },
    }),
  ],
});
