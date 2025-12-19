
"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function AudioFileCard({ file, setModal, fetchFiles, activePlayerId, setActivePlayerId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const playerId = useRef(Date.now().toString());

  // Check if file is actually an audio file
  const isAudioFile = file.name.match(/\.(mp3|wav|webm|ogg|m4a|flac)$/i) !== null;
  
  // Create URL for the audio file (only if it's an audio file)
  const audioUrl = isAudioFile 
    ? `/api/audio-file?fileName=${encodeURIComponent(file.name)}`
    : null;

  const downloadUrl = `/api/audio-file?fileName=${encodeURIComponent(file.name)}&download=true`;

  // Auto-pause other players when this one starts
  useEffect(() => {
    if (isPlaying && activePlayerId !== playerId.current) {
      setActivePlayerId(playerId.current);
    }
  }, [isPlaying, activePlayerId, setActivePlayerId]);

  // Pause if another player becomes active
  useEffect(() => {
    if (activePlayerId !== playerId.current && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [activePlayerId, isPlaying]);

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current || !isAudioFile || audioError) {
      toast.error("Cannot play this file. It may not be an audio file or is corrupted.");
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error("Playback error:", error);
        toast.error("Failed to play audio. The file may be corrupted or unsupported.");
        setIsPlaying(false);
        setAudioError(true);
      });
      setActivePlayerId(playerId.current);
    }
    setIsPlaying(!isPlaying);
  };

  // Handle audio time updates
  const handleTimeUpdate = () => {
    if (!isSeeking && audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100 || 0;
      setAudioProgress(progress);
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
  };

  // Handle audio errors
  const handleAudioError = (e) => {
    console.error("Audio error:", e);
    setAudioError(true);
    setIsPlaying(false);
    
    // Check specific error
    const audio = audioRef.current;
    if (audio) {
      switch(audio.error.code) {
        case audio.error.MEDIA_ERR_ABORTED:
          toast.error("Playback was aborted");
          break;
        case audio.error.MEDIA_ERR_NETWORK:
          toast.error("Network error loading audio file");
          break;
        case audio.error.MEDIA_ERR_DECODE:
          toast.error("Audio file is corrupted or unsupported format");
          break;
        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          toast.error("Audio format not supported by your browser");
          break;
        default:
          toast.error("Cannot play audio file");
      }
    }
  };

  // Handle audio loaded
  const handleAudioLoaded = () => {
    setAudioError(false);
    console.log("Audio loaded successfully:", file.name);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Calculate click position on progress bar
  const handleProgressBarClick = (e) => {
    if (!audioRef.current || !progressBarRef.current || !isAudioFile || audioError) return;
    
    const progressBar = progressBarRef.current;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = (clickPosition / rect.width) * 100;
    
    // Calculate new time
    const newTime = (audioRef.current.duration * percentage) / 100;
    
    // Set the audio time
    audioRef.current.currentTime = newTime;
    setAudioProgress(percentage);
    
    // If audio was paused, start playing
    if (!isPlaying) {
      audioRef.current.play().catch(error => {
        console.error("Playback error after seek:", error);
        toast.error("Cannot play audio from this position");
      });
      setIsPlaying(true);
      setActivePlayerId(playerId.current);
    }
  };

  // Handle drag on progress bar
  const handleProgressBarMouseDown = (e) => {
    if (!isAudioFile || audioError) return;
    
    setIsSeeking(true);
    handleProgressBarClick(e);
    
    const handleMouseMove = (moveEvent) => {
      handleProgressBarClick(moveEvent);
    };
    
    const handleMouseUp = () => {
      setIsSeeking(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Format time display
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current time and duration
  const currentTime = audioRef.current?.currentTime || 0;
  const duration = audioRef.current?.duration || 0;

  // Generate waveform bars (simulated for now)
  const waveformBars = Array.from({ length: 40 }, (_, i) => ({
    height: Math.floor(Math.random() * 30) + 10,
    isActive: i < Math.floor(audioProgress / 2.5)
  }));

  return (
    <>
      {/* Hidden audio element - Only render if it's an audio file */}
      {isAudioFile && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
          onLoadedData={handleAudioLoaded}
          onCanPlay={handleAudioLoaded}
          preload="metadata"
          className="hidden"
        />
      )}

      <div className="bg-white rounded-xl shadow-md border border-blue-100 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${isAudioFile ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${isAudioFile ? 'text-blue-600' : 'text-gray-600'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isAudioFile ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              )}
            </svg>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${isAudioFile ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {isAudioFile ? 'Audio File' : 'Text File'}
          </span>
        </div>

        <h3 className="font-semibold text-blue-800 truncate mb-3">
          {file.name}
        </h3>

        {/* File Status */}
        {audioError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Cannot play this audio file</span>
            </div>
          </div>
        )}

        {/* Audio Player Controls - Only show for audio files */}
        {isAudioFile ? (
          <div className="mb-4">
            {/* Waveform Visualization */}
            <div className="mb-4 bg-blue-50 rounded-lg p-3">
              <div className="flex items-end justify-between h-12 gap-0.5">
                {waveformBars.map((bar, index) => (
                  <div
                    key={index}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      bar.isActive 
                        ? "bg-gradient-to-t from-blue-500 to-blue-600" 
                        : "bg-blue-200"
                    }`}
                    style={{ height: `${bar.height}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Progress and Time */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-blue-600 font-medium">
                {formatTime(currentTime)}
              </span>
              <div 
                ref={progressBarRef}
                className="flex-1 mx-3 relative group"
                onClick={handleProgressBarClick}
                onMouseDown={handleProgressBarMouseDown}
              >
                {/* Progress Bar Container */}
                <div className={`h-1.5 rounded-full overflow-hidden cursor-pointer relative ${
                  audioError ? 'bg-gray-200' : 'bg-blue-200'
                }`}>
                  {/* Progress Fill */}
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${audioError ? 0 : audioProgress}%` }}
                  />
                  
                  {/* Progress Thumb */}
                  {!audioError && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `${audioProgress}%`, marginLeft: '-6px' }}
                    />
                  )}
                </div>
                
                {/* Hover Preview Tooltip */}
                {!audioError && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-blue-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Click to seek
                  </div>
                )}
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Speed Control */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  disabled={audioError}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-colors duration-200 ${
                    audioError 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {playbackRate}x
                </button>
                
                {showSpeedMenu && !audioError && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-blue-100 z-10 min-w-24">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                          playbackRate === rate ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        {rate}x Speed
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                disabled={audioError}
                className={`p-3 rounded-full transition-all duration-200 shadow-md flex items-center justify-center ${
                  audioError
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isPlaying
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>

              {/* Volume Control */}
              <div className="relative">
                <button
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  disabled={audioError}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-colors duration-200 ${
                    audioError 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {volume === 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : volume < 50 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12m-4.5-9.5L12 3v18l-4.5-4.5H4a1 1 0 01-1-1v-7a1 1 0 011-1h3.5z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12m8.121-8.121a12 12 0 010 16.242m-16.242 0a12 12 0 010-16.242M4.929 4.929l14.142 14.142" />
                    )}
                  </svg>
                  {volume}%
                </button>
                
                {showVolumeSlider && !audioError && (
                  <div 
                    className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-blue-100 z-10 p-4 w-48"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a9 9 0 010 12m8.121-8.121a12 12 0 010 16.242m-16.242 0a12 12 0 010-16.242M4.929 4.929l14.142 14.142" />
                      </svg>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                      />
                      <span className="text-sm font-medium text-blue-700 w-10 text-right">
                        {volume}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Text File Display */
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-700">Text File</p>
                <p className="text-sm text-gray-600">Contains transcription text</p>
              </div>
            </div>
          </div>
        )}

        {file.transcription && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
            {file.transcription}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {/* Download Button */}
          <a
            href={downloadUrl}
            download={file.name}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>

          {/* View Button */}
          <button
            onClick={() =>
              setModal({
                open: true,
                fileName: file.name,
                transcription: file.transcription,
              })
            }
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View
          </button>
          
          {/* Delete Button */}
          <button
            onClick={async () => {
              toast.custom(
                (t) => (
                  <div className="bg-white p-6 rounded-xl shadow-2xl border border-blue-100 w-80">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </div>
                      <h3 className="font-bold text-lg text-blue-800">
                        Delete File?
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-6">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold">
                        "{file.name}"
                      </span>
                      ? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => toast.dismiss(t)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              "/api/delete-file",
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  fileName: file.name,
                                }),
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              }
                            );

                            if (response.ok) {
                              toast.success(
                                `"${file.name}" deleted successfully.`
                              );
                              fetchFiles();
                            } else {
                              throw new Error("Delete failed");
                            }
                          } catch (error) {
                            toast.error(
                              `Could not delete "${file.name}". Please try again.`
                            );
                          } finally {
                            toast.dismiss(t);
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
                { duration: Infinity }
              );
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-200 text-red-700 rounded-lg hover:from-red-200 hover:to-red-300 transition-all duration-200 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}