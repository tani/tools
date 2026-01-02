<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";

const WORK_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

const timeLeft = ref(WORK_TIME);
const isRunning = ref(false);
const mode = ref<"work" | "shortBreak" | "longBreak">("work");
const sessionsCompleted = ref(0);

let timerId: number | null = null;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const displayTime = computed(() => formatTime(timeLeft.value));

const progress = computed(() => {
  const total =
    mode.value === "work"
      ? WORK_TIME
      : mode.value === "shortBreak"
      ? SHORT_BREAK
      : LONG_BREAK;
  return ((total - timeLeft.value) / total) * 100;
});

const playAlarm = (count: number = 1) => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  for (let i = 0; i < count; i++) {
    const startTime = audioCtx.currentTime + i * 0.25;
    const duration = 0.1;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startTime);

    gainNode.gain.setValueAtTime(0.1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
};

const startTimer = () => {
  if (isRunning.value) return;
  isRunning.value = true;
  timerId = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      const alarmCount = mode.value === "work" ? 6 : 3;
      stopTimer();
      playAlarm(alarmCount);
      handleSessionEnd();
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  isRunning.value = false;
};

const resetTimer = () => {
  stopTimer();
  if (mode.value === "work") timeLeft.value = WORK_TIME;
  else if (mode.value === "shortBreak") timeLeft.value = SHORT_BREAK;
  else timeLeft.value = LONG_BREAK;
};

const handleSessionEnd = () => {
  if (mode.value === "work") {
    sessionsCompleted.value++;
    if (sessionsCompleted.value % 4 === 0) {
      setMode("longBreak");
    } else {
      setMode("shortBreak");
    }
  } else {
    setMode("work");
  }
};

const setMode = (newMode: typeof mode.value) => {
  stopTimer();
  mode.value = newMode;
  if (newMode === "work") timeLeft.value = WORK_TIME;
  else if (newMode === "shortBreak") timeLeft.value = SHORT_BREAK;
  else timeLeft.value = LONG_BREAK;
};

watch(displayTime, (newTime) => {
  document.title = `${newTime} - ${mode.value === 'work' ? 'Work' : 'Break'}`;
});

onUnmounted(() => {
  stopTimer();
  document.title = "Taniguchi's Tools";
});
</script>

<template>
  <div>
    <h2 class="display-6">Pomodoro Timer</h2>
    <p class="text-muted">A simple Pomodoro timer to help you stay focused and productive.</p>
    <div class="row">
      <div class="col-sm-12">
        <div class="nav nav-pills mb-3">
          <button class="nav-link" :class="{ active: mode === 'work' }" @click="setMode('work')">
            Work
          </button>
          <button
            class="nav-link"
            :class="{ active: mode === 'shortBreak' }"
            @click="setMode('shortBreak')"
          >
            Short Break
          </button>
          <button
            class="nav-link"
            :class="{ active: mode === 'longBreak' }"
            @click="setMode('longBreak')"
          >
            Long Break
          </button>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-6">
        <div class="text-center p-5 bg-light rounded shadow-sm">
          <div class="display-1 fw-bold">{{ displayTime }}</div>
          <div class="progress " style="height: 10px">
            <div
              class="progress-bar"
              role="progressbar"
              :style="{ width: progress + '%' }"
              :aria-valuenow="progress"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <div class="d-flex justify-content-center gap-2">
            <button v-if="!isRunning" class="btn btn-primary px-4" @click="startTimer">
              Start
            </button>
            <button v-else class="btn btn-warning px-4" @click="stopTimer">Pause</button>
            <button class="btn btn-outline-secondary px-4" @click="resetTimer">Reset</button>
            <button class="btn btn-outline-info px-4" @click="playAlarm(mode === 'work' ? 6 : 3)">
              Test Alarm
            </button>
          </div>
        </div>
      </div>
      <div class="col-sm-6">
        <table class="table mt-3">
          <tbody>
            <tr>
              <th>Status</th>
              <td>{{ isRunning ? 'Running' : 'Paused' }}</td>
            </tr>
            <tr>
              <th>Current Mode</th>
              <td class="text-capitalize">{{ mode.replace(/([A-Z])/g, ' $1') }}</td>
            </tr>
            <tr>
              <th>Sessions Completed</th>
              <td>{{ sessionsCompleted }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4">
          <h3>Instructions</h3>
          <ul class="text-muted">
            <li>Work for 25 minutes.</li>
            <li>Take a 5-minute short break.</li>
            <li>Every 4 work sessions, take a 15-minute long break.</li>
            <li>Alarm will sound when time is up.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.display-1 {
  font-family: monospace;
}
</style>
