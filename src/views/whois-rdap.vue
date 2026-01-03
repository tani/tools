<script setup lang="ts">
import { computed, ref } from "vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

type RdapEvent = {
  eventAction?: string;
  eventDate?: string;
};

type RdapVcardItem = [string, Record<string, unknown>?, string?, string?];

type RdapEntity = {
  roles?: string[];
  vcardArray?: [string, RdapVcardItem[]];
};

type RdapNameserver = {
  ldhName?: string;
};

type RdapResponse = {
  ldhName?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
};

const domain = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<RdapResponse | null>(null);
const showRaw = ref(false);

const statusList = computed(() => result.value?.status ?? []);
const nameservers = computed(() => result.value?.nameservers ?? []);
const registrarName = computed(() => getRegistrar(result.value?.entities));

const registrationDate = computed(() => formatEventDate("registration"));
const expirationDate = computed(() => formatEventDate("expiration"));
const updatedDate = computed(() => formatEventDate("last changed"));

const rawJson = computed(() =>
  result.value ? JSON.stringify(result.value, null, 2) : "No data loaded yet.",
);

function cleanDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
}

async function lookupDomain() {
  if (!domain.value.trim()) {
    error.value = "Enter a domain name before searching.";
    return;
  }

  error.value = null;
  loading.value = true;
  result.value = null;
  showRaw.value = false;

  try {
    const query = cleanDomain(domain.value);
    const response = await fetch(`https://rdap.org/domain/${query}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Domain not found or not available via RDAP.");
      }
      throw new Error("Failed to fetch data. Please try again in a moment.");
    }

    const data: RdapResponse = await response.json();
    result.value = data;
  } catch (fetchError) {
    const message =
      fetchError instanceof Error
        ? fetchError.message
        : "Unexpected error while loading RDAP data.";
    error.value = message;
  } finally {
    loading.value = false;
  }
}

function formatEventDate(action: string): string {
  const events = result.value?.events;
  if (!events) {
    return "Not available";
  }
  const event = events.find((item) => item.eventAction === action);
  if (!event?.eventDate) {
    return "Not recorded";
  }
  return new Date(event.eventDate).toLocaleString("en-US");
}

function getRegistrar(entities?: RdapEntity[]): string {
  if (!entities) {
    return "Unknown";
  }
  const registrar = entities.find((entity) => entity.roles?.includes("registrar"));
  if (!registrar?.vcardArray?.[1]) {
    return "Unknown";
  }
  const nameCard = registrar.vcardArray[1].find((item) => item[0] === "fn");
  return (nameCard?.[3] as string | undefined) ?? "Unknown";
}
</script>

<template>
  <div>
    <ToolHeader
      title="WHOIS / RDAP Lookup"
      description="Fetch domain registration data directly from rdap.org without leaving the browser."
    />

    <ToolCard title="Configuration" class="mb-4">
      <form @submit.prevent="lookupDomain" class="row g-3 align-items-end">
        <div class="col-lg-8">
          <label for="domain" class="form-label fw-bold small">Domain Name</label>
          <input
            id="domain"
            v-model="domain"
            type="text"
            class="form-control font-monospace"
            placeholder="example.com"
            autocomplete="off"
          />
          <div class="form-text">
            Use bare domains only. Protocols and paths will be stripped automatically.
          </div>
        </div>
        <div class="col-lg-4 text-lg-end">
          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span
              v-if="loading"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
            {{ loading ? "Searching..." : "Search" }}
          </button>
        </div>
      </form>
    </ToolCard>

    <div v-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>

    <div v-if="!result && !loading && !error" class="alert alert-secondary">
      Enter a domain to view its WHOIS and RDAP details.
    </div>

    <div v-if="result" class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Domain Summary">
          <div class="mb-3">
            <div class="text-muted small fw-bold">Domain</div>
            <div class="font-monospace fw-semibold fs-5">{{ result.ldhName ?? "—" }}</div>
          </div>
          <div>
            <div class="text-muted small fw-bold">Status</div>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <span v-for="status in statusList" :key="status" class="badge text-bg-light">
                {{ status }}
              </span>
              <span v-if="statusList.length === 0" class="text-muted fst-italic"
                >No status records</span
              >
            </div>
          </div>
        </ToolCard>
      </div>

      <div class="col-lg-6 mb-4">
        <ToolCard title="Registrar">
          <div class="text-muted small fw-bold">Name</div>
          <div class="fw-semibold">{{ registrarName }}</div>
        </ToolCard>
      </div>

      <div class="col-lg-6 mb-4">
        <ToolCard title="Key Dates">
          <dl class="row mb-0">
            <dt class="col-sm-4 text-muted small">Registered</dt>
            <dd class="col-sm-8 fw-semibold">{{ registrationDate }}</dd>
            <dt class="col-sm-4 text-muted small">Expires</dt>
            <dd class="col-sm-8 fw-semibold">{{ expirationDate }}</dd>
            <dt class="col-sm-4 text-muted small">Last Updated</dt>
            <dd class="col-sm-8 fw-semibold">{{ updatedDate }}</dd>
          </dl>
        </ToolCard>
      </div>

      <div class="col-lg-6 mb-4">
        <ToolCard title="Nameservers" class="h-100">
          <div v-if="nameservers.length === 0" class="text-muted fst-italic">
            No nameserver records
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="ns in nameservers" :key="ns.ldhName" class="d-flex align-items-center mb-2">
              <span class="badge bg-secondary me-2">NS</span>
              <span class="font-monospace">{{ ns.ldhName }}</span>
            </li>
          </ul>
        </ToolCard>
      </div>

      <div class="col-12 mb-4">
        <ToolCard title="Raw RDAP JSON" no-padding>
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <div class="small text-muted">See the full RDAP payload returned by rdap.org</div>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="showRaw = !showRaw"
            >
              {{ showRaw ? "Hide" : "Show" }}
            </button>
          </div>
          <pre
            v-if="showRaw"
            class="mb-0 p-3 bg-light font-monospace"
            style="white-space: pre-wrap"
            >{{ rawJson }}</pre
          >
        </ToolCard>
      </div>
    </div>
  </div>
</template>
