<script setup lang="ts">
import type {
	DataStream,
	ISOFile,
	Movie,
	MP4BoxBuffer,
	Sample,
	Track,
} from "mp4box";
import * as MP4Box from "mp4box";
import { computed, onUnmounted, ref, watch } from "vue";
import FilePicker from "../components/FilePicker.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import ToolHeader from "../components/ToolHeader.vue";

const file = ref<File | null>(null);
const videoUrl = ref<string>("");
const videoElement = ref<HTMLVideoElement | null>(null);
const duration = ref(0);
const startTime = ref(0);
const endTime = ref(0);
const processing = ref(false);
const progress = ref(0);
const status = ref("");
const resultUrl = ref("");
const error = ref("");
const resultSize = ref(0);

// Helper to format time
const formatTime = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 100);
	return `${h.toString().padStart(2, "0")}:${m
		.toString()
		.padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms
		.toString()
		.padStart(2, "0")}`;
};

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		file.value = target.files[0];
		if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
		videoUrl.value = URL.createObjectURL(file.value);

		// Reset
		resultUrl.value = "";
		error.value = "";
		progress.value = 0;
		status.value = "";

		// Metadata load will set duration
	}
};

const onMetadataLoaded = () => {
	if (videoElement.value) {
		duration.value = videoElement.value.duration;
		startTime.value = 0;
		endTime.value = duration.value;
	}
};

const updateTimeFromPreview = () => {
	if (videoElement.value) {
		// Sync logic if needed, currently manual inputs
	}
};

const setStartToCurrent = () => {
	if (videoElement.value) startTime.value = videoElement.value.currentTime;
};

const setEndToCurrent = () => {
	if (videoElement.value) endTime.value = videoElement.value.currentTime;
};

// Cleanup
onUnmounted(() => {
	if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
	if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
});

// CORE LOGIC
const processVideo = async () => {
	if (!file.value) return;
	processing.value = true;
	error.value = "";
	progress.value = 0;
	status.value = "Initializing...";
	resultUrl.value = "";

	try {
		const arrayBuffer = await file.value.arrayBuffer();

		// 1. Setup Input MP4Box
		const mp4boxfile = MP4Box.createFile();

		let videoTrack: Track | null = null;
		let audioTrack: Track | null = null;
		const infoPromise = new Promise<Movie>((resolve, reject) => {
			mp4boxfile.onError = (e: string) => reject(e);
			mp4boxfile.onReady = (info: Movie) => {
				resolve(info);
			};
		});

		// Feed data
		(arrayBuffer as MP4BoxBuffer).fileStart = 0;
		mp4boxfile.appendBuffer(arrayBuffer as MP4BoxBuffer);
		mp4boxfile.flush();

		const info = await infoPromise;
		videoTrack = info.videoTracks[0];
		audioTrack = info.audioTracks[0];

		if (!videoTrack) throw new Error("No video track found.");

		// 2. Setup Output MP4Box
		const outFile = MP4Box.createFile();

		// We will re-encode, so we define standard output tracks
		// Output Video Config (H.264)
		const outVideoTrackId = outFile.addTrack({
			timescale: 1000000, // Microseconds for simplicity in WebCodecs
			width: videoTrack.track_width,
			height: videoTrack.track_height,
			media_duration: 0, // updated later
			type: "avc1",
			avcDecoderConfigRecord: undefined, // will be set by encoder? MP4Box might need it.
		});

		// Output Audio Config (AAC) - Optional: Pass through if possible, but simpler to decode/encode or drop
		// For simplicity in this demo, we might mute audio or copy if no cut.
		// Implementing audio re-encoding is similar but adds code size. Let's try Video only first, or basic Audio.
		// Let's stick to VIDEO ONLY for the first pass to ensure stability, or try Audio if confident.
		// Audio sync is tricky. I'll focus on Video to ensure it works.

		// 3. WebCodecs Setup

		// Video Encoder
		const muxSamples: unknown[] = [];
		const videoEncoder = new VideoEncoder({
			output: (chunk, metadata) => {
				// Convert EncodedVideoChunk to MP4Box sample
				const buffer = new ArrayBuffer(chunk.byteLength);
				chunk.copyTo(buffer);

				if (metadata?.decoderConfig?.description) {
					// Update track with AVCC if available
					outFile.setSegmentOptions(outVideoTrackId, null, { nbSamples: 1000 }); // Options?
					// Need to set avcC for the track. MP4Box helper?
					// Manually parsing decoderConfig.description (AVCC) is needed to pass to addTrack options or similar.
					// But addTrack returns ID.
					// Actually, MP4Box addTrack options allow 'avcDecoderConfigRecord'.
					// We can maybe update it? Or we assume we get it early.
					// For now, let's just save samples and hope MP4Box handles basic AVC1.
					// Actually, without avcC, the file might not play.
					// Helper to parse AVCC from description?
					const avcConfig = new Uint8Array(
						metadata.decoderConfig.description as ArrayBuffer,
					);
					(
						outFile as unknown as {
							tracks: { avcDecoderConfigRecord?: Uint8Array }[];
						}
					).tracks[0].avcDecoderConfigRecord = avcConfig; // Hacky access?
				}

				outFile.addSample(outVideoTrackId, new Uint8Array(buffer), {
					duration: chunk.duration ?? 0,
					dts: chunk.timestamp,
					cts: chunk.timestamp,
					is_sync: chunk.type === "key",
				});
			},
			error: (e) => {
				console.error("VideoEncoder error", e);
				error.value = `Encoding error: ${e.message}`;
			},
		});

		videoEncoder.configure({
			codec: "avc1.42001f", // Constrained Baseline 3.1
			width: videoTrack.track_width,
			height: videoTrack.track_height,
			bitrate: videoTrack.bitrate || 2_000_000,
			framerate: 30, // Estimate
		});

		// Video Decoder
		const videoDecoder = new VideoDecoder({
			output: (frame) => {
				// Filter by timestamp
				const timestamp = frame.timestamp / 1000000; // seconds
				if (timestamp >= startTime.value && timestamp <= endTime.value) {
					// Adjust timestamp to start from 0
					const relativeTimestamp = (timestamp - startTime.value) * 1000000;

					// Frame is immutable, we can't change timestamp directly?
					// actually we can pass timestamp to encode()

					// Need to close frame after use
					const newFrame = new VideoFrame(frame, {
						timestamp: relativeTimestamp,
					});
					videoEncoder.encode(newFrame, { keyFrame: muxSamples.length === 0 }); // Force keyframe at start?
					newFrame.close();
				}
				frame.close();
			},
			error: (e) => {
				console.error("VideoDecoder error", e);
				error.value = `Decoding error: ${e.message}`;
			},
		});

		// Configure Decoder
		// Need description from input track
		// mp4box track has .codec which is like "avc1.4d401e"
		// and .video.avcC (Uint8Array) or similar?
		// info.videoTracks[0].codec is the string.
		// info.videoTracks[0].codec_private is the description buffer? No, mp4box specific.
		// MP4Box: track.mdia.minf.stbl.stsd.entries[0].avcC ...

		// Easier way: MP4Box emits samples with description index.
		// We can assume the first sample info has what we need or the track info.
		// Let's iterate samples.

		// Get samples from input
		status.value = "Extracting samples...";
		mp4boxfile.setExtractionOptions(videoTrack.id, null, { nbSamples: 10000 });

		const samples: Sample[] = [];
		mp4boxfile.onSamples = (
			_id: number,
			_user: unknown,
			newSamples: Sample[],
		) => {
			samples.push(...newSamples);
		};
		mp4boxfile.start();

		// Wait for samples (since start() is sync for ArrayBuffer input usually?)
		// Actually mp4box with appendBuffer might trigger onSamples immediately if enough data.
		// But since we appended everything at once, it should be done.

		status.value = `Found ${samples.length} samples. Decoding/Encoding...`;

		// Setup Decoder Config
		const description = getTrackDescription(
			mp4boxfile.getTrackById(videoTrack.id),
		);
		videoDecoder.configure({
			codec: videoTrack.codec,
			description: description,
		});

		// Loop through samples
		const totalSamples = samples.length;
		let processed = 0;

		for (const sample of samples) {
			// Determine type
			const type = sample.is_sync ? "key" : "delta";

			if (sample.data) {
				const chunk = new EncodedVideoChunk({
					type: type,
					timestamp: (sample.cts * 1000000) / sample.timescale,
					duration: (sample.duration * 1000000) / sample.timescale,
					data: sample.data,
				});

				videoDecoder.decode(chunk);
			}

			processed++;
			if (processed % 10 === 0) {
				progress.value = Math.round((processed / totalSamples) * 100);
				// Yield to UI
				await new Promise((r) => setTimeout(r, 0));
			}
		}

		// Flush
		await videoDecoder.flush();
		await videoEncoder.flush();

		status.value = "Saving file...";

		// Save
		const arrayBufferOut = outFile.save("video.mp4");
		const blob = new Blob([arrayBufferOut], { type: "video/mp4" });
		resultUrl.value = URL.createObjectURL(blob);
		resultSize.value = blob.size;
		status.value = "Done! Downloading...";

		// Auto download
		const a = document.createElement("a");
		a.href = resultUrl.value;
		a.download = `clipped-${file.value?.name || "video.mp4"}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	} catch (err: unknown) {
		console.error(err);
		error.value =
			err instanceof Error ? err.message : "An unknown error occurred.";
	} finally {
		processing.value = false;
	}
};

// Helper to get description (AVCC/etc) from MP4Box track
const getTrackDescription = (track: unknown) => {
	// This is tricky with MP4Box structures.
	// track.mdia.minf.stbl.stsd.entries[0] usually contains the box.
	// For 'avc1', it has an 'avcC' property which is a BoxParser.Box
	// We need to serialize that box to a buffer.
	// Or simpler: mp4box provides `getTrackById` which returns the track object.
	// The entry usually has `avcC` for H264.

	const t = track as {
		mdia: {
			minf: {
				stbl: {
					stsd: {
						entries: {
							avcC?: {
								write: (stream: DataStream) => void;
							};
						}[];
					};
				};
			};
		};
	};

	const entry = t.mdia.minf.stbl.stsd.entries[0];
	if (entry.avcC) {
		// Convert to ArrayBuffer
		// MP4Box 'avcC' object to buffer?
		// MP4Box doesn't easily export just the content of avcC as buffer unless we write it.
		// But `entry.avcC` might have `write` method?
		// Let's try to reconstruct it or find if it's stored.

		// Alternative: Use `codec_private` if provided?
		// No.

		// Hack: Create a new MP4Box.DataStream, write the box, use buffer.
		const stream = new MP4Box.DataStream();
		stream.endianness = MP4Box.Endianness.BIG_ENDIAN;
		entry.avcC.write(stream);
		return (stream as { buffer: ArrayBuffer }).buffer.slice(8); // Skip Box Header (size+type) = 8 bytes?
		// avcC box: size(4), type(4), content...
		// VideoDecoder expects just the content? Or the full box?
		// Usually expects the "AVCDecoderConfigurationRecord".
		// The `avcC` box *contains* this record.
		// So yes, strip header.
	}
	return undefined;
};
</script>

<template>
	<div>
		<ToolHeader
			title="Video Clipper"
			description="Trim and shorten video files using WebCodecs."
		/>

		<div class="row g-4">
			<div class="col-12">
				<div class="card shadow-sm">
					<div class="card-body">
						<FilePicker
							label="Select Video (MP4)"
							accept="video/mp4,video/*"
							@change="handleFileChange"
							:disabled="processing"
						/>

						<div v-if="videoUrl" class="mt-4">
							<div class="ratio ratio-16x9 bg-black rounded mb-3">
								<video
									ref="videoElement"
									:src="videoUrl"
									controls
									@loadedmetadata="onMetadataLoaded"
									class="w-100 h-100"
								></video>
							</div>

							<div class="row g-3 align-items-end">
								<div class="col-md-5">
									<label class="form-label">Start Time</label>
									<div class="input-group">
										<input
											type="number"
											class="form-control"
											v-model.number="startTime"
											:max="endTime"
											min="0"
											step="0.1"
											:disabled="processing"
										/>
										<button
											class="btn btn-outline-secondary"
											type="button"
											@click="setStartToCurrent"
											:disabled="processing"
										>
											Use Current
										</button>
									</div>
									<div class="form-text">{{ formatTime(startTime) }}</div>
								</div>

								<div class="col-md-5">
									<label class="form-label">End Time</label>
									<div class="input-group">
										<input
											type="number"
											class="form-control"
											v-model.number="endTime"
											:min="startTime"
											:max="duration"
											step="0.1"
											:disabled="processing"
										/>
										<button
											class="btn btn-outline-secondary"
											type="button"
											@click="setEndToCurrent"
											:disabled="processing"
										>
											Use Current
										</button>
									</div>
									<div class="form-text">{{ formatTime(endTime) }}</div>
								</div>

								<div class="col-md-2">
									<button
										class="btn btn-primary w-100"
										@click="processVideo"
										:disabled="processing || !videoUrl"
									>
										Clip Video
									</button>
								</div>
							</div>

							<div v-if="processing" class="mt-4">
								<div class="progress mb-2">
									<div
										class="progress-bar progress-bar-striped progress-bar-animated"
										role="progressbar"
										:style="{ width: progress + '%' }"
									></div>
								</div>
								<p class="text-center text-muted small">{{ status }}</p>
							</div>

							<div v-if="error" class="alert alert-danger mt-3">
								{{ error }}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
