export const registerSW = (options: { immediate?: boolean } = {}) => {
	if (!("serviceWorker" in navigator)) return;

	const { immediate = false } = options;

	const register = async () => {
		try {
			const registration = await navigator.serviceWorker.register("/sw.js", {
				updateViaCache: "none",
			});

			registration.addEventListener("updatefound", () => {
				const newWorker = registration.installing;
				if (!newWorker) return;

				newWorker.addEventListener("statechange", () => {
					if (
						newWorker.state === "installed" &&
						navigator.serviceWorker.controller
					) {
						newWorker.postMessage({ type: "SKIP_WAITING" });
						window.location.reload();
					}
				});
			});

			setInterval(
				() => {
					registration.update();
				},
				60 * 60 * 1000,
			);
		} catch (error) {
			console.error("Service Worker registration failed:", error);
		}
	};

	if (immediate) {
		register();
	} else {
		window.addEventListener("load", register);
	}
};
