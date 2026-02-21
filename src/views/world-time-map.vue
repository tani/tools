<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	watch,
} from "vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

interface PopupState {
	visible: boolean;
	x: number;
	y: number;
	code: string;
	name: string;
	timezone: string | null;
}

const mapMarkup = ref("");
const mapLoadError = ref("");
const mapContainer = ref<HTMLElement | null>(null);
const nowTick = ref(Date.now());
const AOE_TIMEZONE = "Etc/GMT+12";
const popup = ref<PopupState>({
	visible: false,
	x: 0,
	y: 0,
	code: "",
	name: "",
	timezone: null,
});

const fallbackNameByCode = ref<Record<string, string>>({});
const fallbackCodeByName = ref<Record<string, string>>({});
const timezoneLookupByCode = ref<Record<string, string>>({});
const timezoneByCode = new Map<string, string | null>();
const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

const countryCodeAlias: Record<string, string> = {
	DY: "BJ",
	FX: "FR",
	HV: "BF",
	SU: "RU",
	UK: "GB",
	YU: "RS",
	ZR: "CD",
};

const primaryTimezoneByCode: Record<string, string> = {
	AR: "America/Argentina/Buenos_Aires",
	BR: "America/Sao_Paulo",
	CA: "America/Toronto",
	CL: "America/Santiago",
	GL: "America/Nuuk",
	MX: "America/Mexico_City",
	US: "America/New_York",
};

const fallbackTimezoneByCode: Record<string, string> = {
	AC: "Atlantic/St_Helena",
	BQSA: "America/Kralendijk",
	BQSE: "America/Kralendijk",
	CD: "Africa/Kinshasa",
	CP: "Pacific/Tahiti",
	CQ: "Europe/London",
	DG: "Indian/Chagos",
	EA: "Africa/Ceuta",
	EU: "Europe/Brussels",
	EZ: "Europe/Brussels",
	IC: "Atlantic/Canary",
	QO: "Pacific/Guam",
	RU: "Europe/Moscow",
	TA: "Atlantic/St_Helena",
	TP: "Asia/Dili",
	XK: "Europe/Belgrade",
};

let detachMapListeners: (() => void) | null = null;
let clockInterval: number | null = null;

const popupTimeText = computed(() => {
	if (!popup.value.visible) return "";
	if (!popup.value.timezone) return "Time zone unavailable";
	try {
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZone: popup.value.timezone,
			timeZoneName: "short",
		}).format(nowTick.value);
	} catch {
		return "Time unavailable";
	}
});

const aoeTimeText = computed(() => {
	try {
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZone: AOE_TIMEZONE,
			timeZoneName: "short",
		}).format(nowTick.value);
	} catch {
		return "Time unavailable";
	}
});

const localTimeText = computed(() => {
	try {
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZoneName: "short",
		}).format(nowTick.value);
	} catch {
		return "Time unavailable";
	}
});

const popupStyle = computed(() => ({
	left: `${popup.value.x}px`,
	top: `${popup.value.y}px`,
}));

function normalizeCountryCode(value: string) {
	return value.trim().toUpperCase();
}

function canonicalCountryCode(value: string) {
	return countryCodeAlias[value] ?? value;
}

function normalizeCountryLabel(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function resolveCountryCodeFromLabel(value?: string | null) {
	if (!value) return null;
	const normalized = normalizeCountryLabel(value);
	if (!normalized) return null;

	const exact = fallbackCodeByName.value[normalized];
	if (exact) return exact;

	// Loose match for map labels that include extra words/punctuation.
	for (const [name, code] of Object.entries(fallbackCodeByName.value)) {
		if (normalized.includes(name) || name.includes(normalized)) {
			return code;
		}
	}
	return null;
}

function resolveCountryName(code: string, explicitName?: string | null) {
	if (explicitName && explicitName.trim().length > 0) {
		return explicitName.trim();
	}
	const mappedName = fallbackNameByCode.value[code];
	if (mappedName) return mappedName;
	try {
		const displayName = countryDisplayNames.of(canonicalCountryCode(code));
		if (displayName) return displayName;
	} catch {
		// Ignore region lookup failures and fallback to raw code.
	}
	return code;
}

function getPointFromEvent(event: PointerEvent) {
	return {
		x: event.clientX,
		y: event.clientY,
	};
}

function getCountryFromEventTarget(target: EventTarget | null) {
	if (!(target instanceof Element)) return null;
	const pathEl = target.closest("path[id], path[name], path[class]");
	if (!pathEl) return null;

	const rawCode = pathEl.getAttribute("id");
	const nameAttr = pathEl.getAttribute("name");
	const classAttr = pathEl.getAttribute("class");
	const className = classAttr?.trim() || null;
	const inferredCode = resolveCountryCodeFromLabel(nameAttr || className);
	const code = rawCode ? normalizeCountryCode(rawCode) : inferredCode;
	if (!code) return null;
	const name = resolveCountryName(code, nameAttr || className);

	return { code, name };
}

function resolveTimezone(code: string) {
	if (timezoneByCode.has(code)) {
		return timezoneByCode.get(code) ?? null;
	}

	const canonicalCode = canonicalCountryCode(code);
	if (timezoneByCode.has(canonicalCode)) {
		const cached = timezoneByCode.get(canonicalCode) ?? null;
		timezoneByCode.set(code, cached);
		return cached;
	}

	const fallback =
		primaryTimezoneByCode[code] ||
		primaryTimezoneByCode[canonicalCode] ||
		timezoneLookupByCode.value[code] ||
		timezoneLookupByCode.value[canonicalCode] ||
		fallbackTimezoneByCode[code] ||
		fallbackTimezoneByCode[canonicalCode] ||
		null;

	let timezone: string | null = null;
	try {
		const locale = new Intl.Locale(`en-${canonicalCode}`);
		const zones =
			typeof locale.getTimeZones === "function" ? locale.getTimeZones() : null;
		if (Array.isArray(zones) && zones.length > 0) {
			timezone = zones[0];
		}
	} catch {
		// Ignore unsupported region codes and use fallback.
	}

	if (!timezone) {
		timezone = fallback;
	}

	timezoneByCode.set(canonicalCode, timezone);
	timezoneByCode.set(code, timezone);
	return timezone;
}

function hidePopup() {
	popup.value.visible = false;
}

function handleMapPointer(event: PointerEvent) {
	const container = mapContainer.value;
	if (!container) return;
	const point = getPointFromEvent(event);
	const rect = container.getBoundingClientRect();
	const nextX = Math.max(8, point.x - rect.left + 12);
	const nextY = Math.max(8, point.y - rect.top + 12);

	const country = getCountryFromEventTarget(event.target);
	if (!country) {
		popup.value.visible = true;
		popup.value.x = nextX;
		popup.value.y = nextY;
		popup.value.code = "AOE";
		popup.value.name = "Anywhere on Earth";
		popup.value.timezone = AOE_TIMEZONE;
		return;
	}

	popup.value.visible = true;
	popup.value.x = nextX;
	popup.value.y = nextY;
	popup.value.code = country.code;
	popup.value.name = country.name;
	popup.value.timezone = resolveTimezone(country.code);
}

function attachListeners() {
	const container = mapContainer.value;
	if (!container) return;
	if (detachMapListeners) detachMapListeners();

	const pointerHandler = (event: PointerEvent) => {
		handleMapPointer(event);
	};
	const leaveHandler = () => hidePopup();

	container.addEventListener("pointermove", pointerHandler);
	container.addEventListener("pointerdown", pointerHandler);
	container.addEventListener("pointerleave", leaveHandler);

	detachMapListeners = () => {
		container.removeEventListener("pointermove", pointerHandler);
		container.removeEventListener("pointerdown", pointerHandler);
		container.removeEventListener("pointerleave", leaveHandler);
	};
}

async function loadIsoFallbackNames() {
	try {
		const response = await fetch("/iso3166.json");
		if (!response.ok) return;
		const mapping = (await response.json()) as Record<string, string>;
		const reverse: Record<string, string> = {};
		const codeByName: Record<string, string> = {};
		for (const [name, code] of Object.entries(mapping)) {
			const normalizedCode = normalizeCountryCode(code);
			const normalizedName = normalizeCountryLabel(name);
			if (!reverse[normalizedCode]) {
				reverse[normalizedCode] = name;
			}
			if (normalizedName && !codeByName[normalizedName]) {
				codeByName[normalizedName] = normalizedCode;
			}
		}
		fallbackNameByCode.value = reverse;
		fallbackCodeByName.value = codeByName;
	} catch {
		// Keep built-in name fallback if JSON is missing.
	}
}

async function loadTimezoneLookup() {
	try {
		const response = await fetch("/country-timezones.json");
		if (!response.ok) return;
		const mapping = (await response.json()) as Record<string, string>;
		const normalized: Record<string, string> = {};
		for (const [code, timezone] of Object.entries(mapping)) {
			const normalizedCode = normalizeCountryCode(code);
			if (typeof timezone === "string" && timezone.length > 0) {
				normalized[normalizedCode] = timezone;
			}
		}
		timezoneLookupByCode.value = normalized;
	} catch {
		// Fallback table handles essential regions if JSON is missing.
	}
}

async function loadMap() {
	mapLoadError.value = "";
	try {
		const response = await fetch("/worldmap.with-iso3166.svg");
		if (!response.ok) {
			throw new Error("Unable to load worldmap.with-iso3166.svg");
		}
		mapMarkup.value = await response.text();
	} catch (error) {
		mapLoadError.value =
			error instanceof Error
				? error.message
				: "Failed to load the world map SVG.";
	}
}

watch(mapMarkup, async (value) => {
	if (!value) return;
	await nextTick();
	attachListeners();
});

onMounted(async () => {
	await Promise.all([loadIsoFallbackNames(), loadTimezoneLookup(), loadMap()]);
	clockInterval = window.setInterval(() => {
		nowTick.value = Date.now();
	}, 1000);
});

onBeforeUnmount(() => {
	if (detachMapListeners) detachMapListeners();
	if (clockInterval !== null) {
		window.clearInterval(clockInterval);
	}
});
</script>

<template>
  <div>
	    <ToolHeader
	      title="World Time Map"
	      description="Hover or tap any country to see its country code and current local time."
	    />

	    <div class="map-time-panels-outside d-flex flex-wrap gap-2 mb-3">
	      <div class="card border-0 shadow-sm panel-card">
	        <div class="card-body p-2">
	          <div class="text-muted small">AoE</div>
	          <div class="font-monospace small fw-semibold">{{ aoeTimeText }}</div>
	        </div>
	      </div>
	      <div class="card border-0 shadow-sm panel-card">
	        <div class="card-body p-2">
	          <div class="text-muted small">Local</div>
	          <div class="font-monospace small fw-semibold">{{ localTimeText }}</div>
	        </div>
	      </div>
	    </div>

	    <ToolCard title="Interactive Map">
	      <div
	        ref="mapContainer"
	        class="map-stage position-relative bg-light border rounded overflow-auto"
	      >
	        <div v-if="mapLoadError" class="text-danger small p-3">{{ mapLoadError }}</div>
	        <div v-else-if="!mapMarkup" class="text-muted small p-3">Loading world map...</div>
	        <div v-else class="map-svg" v-html="mapMarkup" />

        <div
          v-if="popup.visible"
          class="country-popup card shadow-sm border-0"
          :style="popupStyle"
        >
          <div class="card-body p-2">
            <div class="fw-bold small">{{ popup.name }}</div>
            <div class="text-muted small mb-1">{{ popup.code }}</div>
            <div class="font-monospace small">{{ popupTimeText }}</div>
          </div>
        </div>
      </div>
    </ToolCard>
  </div>
</template>

<style scoped>
.map-stage {
	min-height: 520px;
	max-height: 80vh;
}

.map-svg :deep(svg) {
	display: block;
	min-width: 900px;
	width: 100%;
	height: auto;
}

.map-svg :deep(path[id]) {
	cursor: pointer;
	transition: fill 120ms ease-in-out;
}

.map-svg :deep(path[id]:hover) {
	fill: #9dc9ff;
}

.panel-card {
	min-width: 220px;
}

.country-popup {
	position: absolute;
	pointer-events: none;
	min-width: 180px;
	max-width: 260px;
	z-index: 10;
}
</style>
