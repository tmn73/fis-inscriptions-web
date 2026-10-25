"use client";

import {useSyncExternalStore} from "react";
import {AlertTriangle, Chrome} from "lucide-react";

type BrowserInfo = {
  isChrome: boolean;
  isSafari: boolean;
  isMac: boolean;
};

export const detectBrowser = (): BrowserInfo => {
  if (typeof window === "undefined") {
    return {isChrome: false, isSafari: false, isMac: false};
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isMac = /Mac/.test(platform);

  return {isChrome, isSafari, isMac};
};

// The browser never changes during a page view, so there is nothing to subscribe to
const subscribeToNothing = () => () => {};

const isChromeOnMac = () => {
  const info = detectBrowser();
  return info.isChrome && info.isMac;
};

export const BrowserWarning = () => {
  const showWarning = useSyncExternalStore(
    subscribeToNothing,
    isChromeOnMac,
    () => false
  );

  if (!showWarning) return null;

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Problème de génération PDF détecté
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Vous utilisez Chrome sur Mac. La génération de PDF peut présenter
            des problèmes de formatage (tables mal alignées, colonnes
            manquantes, etc.).
          </p>
          <div className="space-y-2 text-sm text-yellow-700">
            <p className="font-medium">Solutions recommandées :</p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center space-x-2">
                <span className="h-4 w-4 text-blue-600">🧭</span>
                <span>
                  <strong>Recommandé :</strong> Utilisez Safari sur Mac pour une
                  génération PDF optimale
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Chrome className="h-4 w-4 text-blue-600" />
                <span>Ou utilisez Chrome sur Windows/Linux</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={() => {
                const currentUrl = window.location.href;
                const safariUrl = currentUrl.replace(/^https?:/, 'x-safari-https:');
                window.location.replace(safariUrl);
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 cursor-pointer"
            >
              🧭 Ouvrir dans Safari
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
