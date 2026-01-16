import fs from "node:fs/promises";
import path from "node:path";
import { createUnplugin } from "unplugin";
import { generateSW } from "workbox-build";

interface PWAOptions {
	manifest?: Record<string, unknown>;
	workbox?: Record<string, unknown>;
}

export default createUnplugin((options: PWAOptions = {}) => {
	let outDir = "dist";
	let isDev = false;
	const virtualModuleId = "virtual:pwa-register";
	const resolvedVirtualModuleId = `\0${virtualModuleId}`;

	return {
		name: "custom-pwa",
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				if (isDev) {
					return "export const registerSW = () => {};";
				}
				return `export const registerSW = (options = {}) => {
          if (!('serviceWorker' in navigator)) return;

          const { immediate = false } = options;

          const register = async () => {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js', {
                updateViaCache: 'none'
              });

              // Auto-update: check for updates and reload when available
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available - auto update
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                });
              });

              // Check for updates every hour
              setInterval(() => {
                registration.update();
              }, 60 * 60 * 1000);

            } catch (error) {
              console.error('Service Worker registration failed:', error);
            }
          };

          if (immediate) {
            register();
          } else {
            window.addEventListener('load', register);
          }
        }`;
			}
		},
		vite: {
			configResolved(config) {
				outDir = path.resolve(config.root, config.build.outDir);
				isDev = config.command === "serve";
			},
			async closeBundle() {
				// Only run in production build
				if (process.env.NODE_ENV === "development") return;

				// Ensure outDir exists
				try {
					await fs.access(outDir);
				} catch {
					return;
				}

				// Write manifest
				if (options.manifest) {
					const manifestPath = path.resolve(outDir, "manifest.webmanifest");
					await fs.writeFile(
						manifestPath,
						JSON.stringify(options.manifest, null, 2),
					);
				}

				// Generate Service Worker
				await generateSW({
					swDest: path.resolve(outDir, "sw.js"),
					globDirectory: outDir,
					skipWaiting: true,
					clientsClaim: true,
					...options.workbox,
				});
			},
			transformIndexHtml(html) {
				if (isDev) return html;
				return html.replace(
					"</head>",
					'  <link rel="manifest" href="/manifest.webmanifest">\n</head>',
				);
			},
		},
	};
});
