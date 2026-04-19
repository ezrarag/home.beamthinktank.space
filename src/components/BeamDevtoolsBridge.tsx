'use client';

import { useEffect, useState } from 'react';
import { beamDevtoolsFirebaseConfig, hasBeamDevtoolsFirebaseConfig } from '@/lib/devtools/publicConfig';

const SITE_SLUG = 'home';
const SITE_DISPLAY_NAME = 'BEAM Home';
const DEFAULT_SITE_URL = 'https://beamthinktank.space';

type BeamDevtoolsWindow = Window &
  typeof globalThis & {
    __BEAM_DEVTOOLS_CONFIG__?: Record<string, string> | null;
    __BEAM_PAGE_DEBUG__?: Record<string, unknown> | null;
  };

function resolveSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configuredSiteUrl && configuredSiteUrl !== 'undefined' ? configuredSiteUrl : DEFAULT_SITE_URL;
}

const siteUrl = resolveSiteUrl();

function readLocationState() {
  if (typeof window === 'undefined') {
    return {
      pathname: '',
      search: '',
    };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export default function BeamDevtoolsBridge() {
  const [locationState, setLocationState] = useState(readLocationState);

  useEffect(() => {
    const syncLocationState = () => {
      setLocationState(readLocationState());
    };

    syncLocationState();

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const patchedPushState: History['pushState'] = (...args) => {
      originalPushState(...args);
      syncLocationState();
    };

    const patchedReplaceState: History['replaceState'] = (...args) => {
      originalReplaceState(...args);
      syncLocationState();
    };

    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;
    window.addEventListener('popstate', syncLocationState);
    window.addEventListener('hashchange', syncLocationState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', syncLocationState);
      window.removeEventListener('hashchange', syncLocationState);
    };
  }, []);

  useEffect(() => {
    const beamWindow = window as BeamDevtoolsWindow;

    beamWindow.__BEAM_PAGE_DEBUG__ = {
      ngo: SITE_SLUG,
      siteSlug: SITE_SLUG,
      displayName: SITE_DISPLAY_NAME,
      domain: window.location.hostname,
      origin: window.location.origin,
      siteUrl,
      pathname: locationState.pathname,
      search: locationState.search,
      checklistCollection: 'devChecklists',
      devtoolsProjectId: beamDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID || null,
      entryChannel: 'home.beamthinktank.space',
      googleDriveFolderSwitcherEnabled: true,
    };

    beamWindow.__BEAM_DEVTOOLS_CONFIG__ = hasBeamDevtoolsFirebaseConfig()
      ? { ...beamDevtoolsFirebaseConfig }
      : null;
  }, [locationState.pathname, locationState.search]);

  return null;
}
