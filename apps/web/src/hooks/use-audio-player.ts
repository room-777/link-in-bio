"use client";

import type { ProviderData } from "@grabbin/api";
import { useCallback, useEffect, useRef, useState } from "react";

type SpotifyTrack = NonNullable<
	NonNullable<ProviderData["spotify"]>["tracks"]
>[number];

function findPlayableTrackIndex(
	tracks: readonly SpotifyTrack[],
	startIndex: number,
): number | null {
	for (let index = startIndex; index < tracks.length; index += 1) {
		if (tracks[index]?.previewUrl) return index;
	}
	return null;
}

export function useSpotifyPlayer(tracks: readonly SpotifyTrack[] = []) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const tracksRef = useRef(tracks);
	const currentTrackIndexRef = useRef<number | null>(null);
	const playTrackRef = useRef<((index: number) => void) | null>(null);
	const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(
		null,
	);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);

	tracksRef.current = tracks;

	const playTrack = useCallback((index: number) => {
		const track = tracksRef.current[index];
		const audio = audioRef.current;
		if (!track?.previewUrl || !audio) return;

		currentTrackIndexRef.current = index;
		setCurrentTrackIndex(index);
		setProgress(0);
		if (audio.src === track.previewUrl) audio.currentTime = 0;
		else audio.src = track.previewUrl;
		void audio.play().catch(() => setIsPlaying(false));
	}, []);
	playTrackRef.current = playTrack;

	useEffect(() => {
		const audio = new Audio();
		audioRef.current = audio;

		const updateProgress = () => {
			setProgress(
				audio.duration > 0
					? Math.min(1, audio.currentTime / audio.duration)
					: 0,
			);
		};
		const onEnded = () => {
			const currentIndex = currentTrackIndexRef.current;
			const nextIndex =
				currentIndex === null
					? null
					: findPlayableTrackIndex(tracksRef.current, currentIndex + 1);
			if (nextIndex !== null) {
				playTrackRef.current?.(nextIndex);
				return;
			}

			currentTrackIndexRef.current = null;
			setCurrentTrackIndex(null);
			setIsPlaying(false);
			setProgress(0);
		};
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onError = () => setIsPlaying(false);

		audio.addEventListener("timeupdate", updateProgress);
		audio.addEventListener("ended", onEnded);
		audio.addEventListener("play", onPlay);
		audio.addEventListener("pause", onPause);
		audio.addEventListener("error", onError);

		return () => {
			audio.pause();
			audio.removeEventListener("timeupdate", updateProgress);
			audio.removeEventListener("ended", onEnded);
			audio.removeEventListener("play", onPlay);
			audio.removeEventListener("pause", onPause);
			audio.removeEventListener("error", onError);
			audioRef.current = null;
		};
	}, []);

	const togglePlayback = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (!audio.paused) {
			audio.pause();
			return;
		}

		if (audio.ended || currentTrackIndexRef.current === null) {
			const firstIndex = findPlayableTrackIndex(tracksRef.current, 0);
			if (firstIndex !== null) playTrack(firstIndex);
			return;
		}

		void audio.play().catch(() => setIsPlaying(false));
	}, [playTrack]);

	return { currentTrackIndex, isPlaying, progress, playTrack, togglePlayback };
}
