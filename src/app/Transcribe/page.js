"use client";
import { useState, useEffect, useRef } from "react";
import Navbar from "../components/navbar";
import TranscriptionModal from "../components/TranscriptionModal";
import AudioFileCard from "../components/AudioFileCard";
import { toast } from "sonner";
import { apiFetch, apiUpload } from "../lib/api"; // Import the new API utilities

export default function Page() {
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [tempTranscription, setTempTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filesList, setFilesList] = useState([]);
  const [modal, setModal] = useState({
    open: false,
    fileName: "",
    transcription: "",
  });

  // Real-time transcription states
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [isListeningForQuestion, setIsListeningForQuestion] = useState(false);
  const [liveAudioRecording, setLiveAudioRecording] = useState(false);
  const [liveAudioChunks, setLiveAudioChunks] = useState([]);
  const liveMediaRecorderRef = useRef(null);
  const liveAudioStreamRef = useRef(null);

  // Q&A Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // Audio states
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // Speech recognition
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  
  // Active player state
  const [activePlayerId, setActivePlayerId] = useState(null);

  // API Base URL for direct use (if needed)
  const API_BASE_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:5000/api';

  const fetchFiles = async () => {
    try {
      const data = await apiFetch('/files');
      setFilesList(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
      setFilesList([]);
    }
  };

  useEffect(() => {
    fetchFiles();
    
    // Initialize speech recognition if available
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            
            // Check if this is a question
            const text = transcript.trim().toLowerCase();
            if (isListeningForQuestion && (text.endsWith('?') || text.includes('what') || text.includes('how') || text.includes('why') || text.includes('when') || text.includes('where') || text.includes('who'))) {
              handleQuestion(transcript);
            }
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update live transcription
        setLiveTranscription(prev => {
          const base = prev.split('[Interim:]')[0];
          return base + '[Interim:] ' + interimTranscript;
        });
        
        // Add final transcript to the main transcription
        if (finalTranscript) {
          setLiveTranscription(prev => {
            const base = prev.split('[Interim:]')[0];
            return base + finalTranscript + ' ';
          });
        }
      };
      
      recognitionRef.current.onend = () => {
        if (isLiveTranscribing) {
          // Restart recognition if still active
          setTimeout(() => {
            if (isLiveTranscribing && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // Real-time transcription functions
  const startLiveTranscription = async () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in your browser. Try Chrome.");
      return;
    }
    
    try {
      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveAudioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      liveMediaRecorderRef.current = mediaRecorder;
      
      setLiveAudioChunks([]);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setLiveAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      mediaRecorder.start(1000);
      setLiveAudioRecording(true);
      
      // Start speech recognition
      setIsLiveTranscribing(true);
      setLiveTranscription("");
      setChatMessages([]);
      
      recognitionRef.current.start();
      toast.success("🎤 Live transcription started. Speak now...");
      
    } catch (error) {
      console.error("Failed to start live transcription:", error);
      toast.error("Failed to start. Check microphone permissions.");
      setIsLiveTranscribing(false);
      setLiveAudioRecording(false);
    }
  };

  const stopLiveTranscription = () => {
    setIsLiveTranscribing(false);
    
    // Stop audio recording
    if (liveMediaRecorderRef.current && liveAudioRecording) {
      liveMediaRecorderRef.current.stop();
    }
    
    // Stop media stream
    if (liveAudioStreamRef.current) {
      liveAudioStreamRef.current.getTracks().forEach(track => track.stop());
      liveAudioStreamRef.current = null;
    }
    
    setLiveAudioRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    toast.info("Live transcription stopped");
  };

  const toggleQuestionMode = () => {
    const newMode = !isListeningForQuestion;
    setIsListeningForQuestion(newMode);
    toast(newMode ? "🔍 Question mode ON - I'll answer your questions" : "Question mode OFF");
  };

  const handleQuestion = async (question) => {
    if (!question.trim()) return;
    
    // Add user question to chat
    setChatMessages(prev => [...prev, { 
      type: 'user', 
      text: question,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    setIsAnswering(true);
    
    try {
      // Call Q&A API with Railway backend
      const data = await apiFetch('/qa/ask', {
        method: "POST",
        body: JSON.stringify({
          question: question,
          context: liveTranscription.replace('[Interim:]', '').trim()
        }),
      });
      
      if (data.answer) {
        // Add AI answer to chat
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          text: data.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        
        // Speak the answer (optional)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.answer);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      toast.error("Failed to get answer");
    } finally {
      setIsAnswering(false);
    }
  };

  const handleTextQuestion = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isAnswering) return;
    
    await handleQuestion(userInput);
    setUserInput("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setFile(e.dataTransfer.files[0]);
    setTempTranscription("");
  };
  
  const handleDragOver = (e) => e.preventDefault();

  const startRecording = async () => {
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      mediaRecorder.start();
    } catch (error) {
      alert("Microphone access denied. Please allow microphone permissions.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return resolve();

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const recordedFile = new File(
          [blob],
          `recording_${new Date().toISOString().slice(0, 10)}.wav`,
          { type: "audio/wav" }
        );
        setFile(recordedFile);
        setRecording(false);
        resolve();
      };
      mediaRecorder.stop();
    });
  };

  const handleTranscribe = async () => {
    if (!file) return alert("Upload or record audio first!");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Use the apiUpload utility for file uploads
      const data = await apiUpload('/transcribe', formData);
      
      if (data.transcription) {
        setTempTranscription(data.transcription);
        toast.success("Transcription complete!");
      } else {
        toast.error("Error transcribing file");
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Failed to transcribe audio");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Save transcription
      await apiUpload('/transcribe', formData);
      
      toast.success("Transcription saved!");
      setTempTranscription("");
      setFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save transcription");
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const clearChat = () => {
    setChatMessages([]);
    toast.info("Chat cleared");
  };

  const saveLiveTranscription = async () => {
    if (!liveTranscription.trim()) {
      toast.error("No transcription to save");
      return;
    }

    const finalText = liveTranscription.replace('[Interim:]', '').trim();
    if (!finalText) {
      toast.error("No transcription to save");
      return;
    }

    setSaving(true);
    
    try {
      // Create audio blob from recorded chunks
      let audioBlob = null;
      if (liveAudioChunks.length > 0) {
        audioBlob = new Blob(liveAudioChunks, { type: 'audio/webm' });
      }
      
      // Create form data
      const formData = new FormData();
      formData.append("text", finalText);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      const baseFileName = `live_transcription_${timestamp}`;
      
      // Append audio file if available
      if (audioBlob && audioBlob.size > 0) {
        const audioFile = new File([audioBlob], `${baseFileName}.webm`, { type: 'audio/webm' });
        formData.append("audio", audioFile);
        formData.append("hasAudio", "true");
        formData.append("fileExtension", "webm");
      } else {
        formData.append("hasAudio", "false");
      }
      
      formData.append("fileName", baseFileName);
      
      // Save to Railway backend
      const data = await apiUpload('/live/save', formData);
      
      if (data.success) {
        toast.success("Live transcription saved!");
        setLiveTranscription("");
        setLiveAudioChunks([]);
        fetchFiles();
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch (error) {
      console.error('Save live transcription error:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Updated AudioFileCard integration for Railway backend
  const handleFilePlay = (filename) => {
    // Play audio from Railway backend
    const audioUrl = `${API_BASE_URL.replace('/api', '')}/uploads/${filename}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.error('Audio play error:', e));
  };

  const handleFileDownload = (filename) => {
    // Download from Railway backend
    window.open(`${API_BASE_URL}/files/download/${filename}`, '_blank');
  };

  const handleFileDelete = async (filename) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    
    try {
      await apiFetch(`/files/${filename}`, {
        method: 'DELETE',
      });
      
      toast.success("File deleted");
      fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Failed to delete file");
    }
  };

  return (
    <>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="p-4 md:p-6 lg:p-8 bg-gradient-to-b from-blue-50 to-white min-h-screen">
        {activeTab === "upload" && (
          <div className="w-full max-w-6xl mx-auto">
            {/* Real-time Transcription Section */}
            <div className="mb-6 md:mb-8 bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg p-4 md:p-6 border border-blue-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
                <div className="mb-3 md:mb-0">
                  <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-1 md:mb-2">
                    🎤 Live Speech-to-Text
                  </h2>
                  <p className="text-sm md:text-base text-blue-600">
                    Speak and get real-time transcription with Q&A
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <button
                    onClick={toggleQuestionMode}
                    className={`px-3 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-all text-sm md:text-base ${
                      isListeningForQuestion
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden xs:inline">Q&A:</span> {isListeningForQuestion ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={isLiveTranscribing ? stopLiveTranscription : startLiveTranscription}
                    className={`px-4 md:px-6 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-all text-sm md:text-base ${
                      isLiveTranscribing
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md animate-pulse"
                        : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-md"
                    }`}
                  >
                    {isLiveTranscribing ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span className="hidden sm:inline">Stop Live</span>
                        <span className="sm:hidden">Stop</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="hidden sm:inline">Start Live</span>
                        <span className="sm:hidden">Start</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={saveLiveTranscription}
                    disabled={!liveTranscription.trim() || saving}
                    className="px-3 md:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span className="hidden sm:inline">Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full ${isLiveTranscribing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs md:text-sm text-gray-600">
                    {isLiveTranscribing ? 'Transcribing' : 'Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full ${liveAudioRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs md:text-sm text-gray-600">
                    {liveAudioRecording ? 'Recording' : 'Mic Ready'}
                  </span>
                </div>
              </div>

              {/* Live Transcription Output */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm md:text-base font-semibold text-blue-700">Live Transcription:</h3>
                  <span className="text-xs md:text-sm text-blue-600">
                    {isLiveTranscribing ? (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                        Listening...
                      </span>
                    ) : "Ready"}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 h-32 md:h-40 overflow-y-auto">
                  {liveTranscription ? (
                    <div className="whitespace-pre-wrap text-sm md:text-base">
                      {liveTranscription.split('[Interim:]').map((part, index) => (
                        <span key={index} className={index > 0 ? "text-blue-600 opacity-75" : "text-gray-800"}>
                          {part}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-6 md:py-8 text-sm md:text-base">
                      {isLiveTranscribing 
                        ? "Start speaking... I'm listening!" 
                        : "Click 'Start Live' to begin"}
                    </p>
                  )}
                </div>
              </div>

              {/* Q&A Chat Interface */}
              <div className="border-t border-blue-100 pt-4 md:pt-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="text-sm md:text-base font-semibold text-blue-700">Q&A Chat:</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={clearChat}
                      className="text-xs md:text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 md:px-3 py-1 hover:bg-blue-50 rounded-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="bg-white border border-blue-200 rounded-lg p-3 md:p-4 h-48 md:h-64 overflow-y-auto mb-3 md:mb-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 md:py-12 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="text-sm md:text-base">Ask questions about your transcription</p>
                      <p className="text-xs md:text-sm mt-1">Questions will be answered here</p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {chatMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
                              msg.type === 'user'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none'
                                : 'bg-gradient-to-r from-green-50 to-green-100 text-gray-800 rounded-bl-none border border-green-200'
                            }`}
                          >
                            <div className="flex items-center gap-1 md:gap-2 mb-1">
                              {msg.type === 'ai' && (
                                <div className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">AI</span>
                                </div>
                              )}
                              <span className="text-xs opacity-75">
                                {msg.type === 'user' ? 'You' : 'Assistant'} • {msg.time}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm md:text-base">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      {isAnswering && (
                        <div className="flex justify-start">
                          <div className="bg-gradient-to-r from-green-50 to-green-100 text-gray-800 rounded-2xl rounded-bl-none px-3 py-2 md:px-4 md:py-3 border border-green-200">
                            <div className="flex items-center gap-1 md:gap-2">
                              <div className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">AI</span>
                              </div>
                              <span className="text-xs opacity-75">Thinking...</span>
                            </div>
                            <div className="flex gap-1 mt-1 md:mt-2">
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Text Input for Q&A */}
                <form onSubmit={handleTextQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 px-3 py-2 md:px-4 md:py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                    disabled={isAnswering}
                  />
                  <button
                    type="submit"
                    disabled={!userInput.trim() || isAnswering}
                    className="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
                  >
                    {isAnswering ? (
                      <>
                        <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Thinking...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span className="hidden sm:inline">Ask</span>
                        <span className="sm:hidden">Go</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Upload/Record Audio Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-800 mb-1 md:mb-2">
                Upload or Record Audio
              </h2>
              <p className="text-sm md:text-base text-blue-600">
                Convert your audio files to text using Whisper AI
              </p>
            </div>

            <div className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg p-4 md:p-6 mb-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 text-white font-semibold transition-all duration-300 transform hover:scale-105 w-full sm:w-auto justify-center ${
                    recording
                      ? "bg-gradient-to-r from-red-500 to-red-600 shadow-md md:shadow-lg animate-pulse"
                      : "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-md md:hover:shadow-lg"
                  }`}
                >
                  {recording ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 md:h-6 md:w-6 animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-sm md:text-base">Stop Recording</span>
                        <span className="text-xs">({formatTime(recordingTime)})</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 md:h-6 md:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      <span className="text-sm md:text-base">Record Voice</span>
                    </>
                  )}
                </button>

                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 md:h-5 md:w-5 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span
                      className={`font-medium text-sm md:text-base truncate ${
                        file ? "text-blue-700" : "text-gray-500"
                      }`}
                    >
                      {file ? file.name : "No file selected"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="w-full h-48 md:h-64 border-2 md:border-3 border-dashed border-blue-300 flex flex-col items-center justify-center mb-4 md:mb-6 rounded-lg md:rounded-xl bg-blue-50 hover:bg-blue-100 transition-all duration-300 cursor-pointer"
              >
                {file ? (
                  <div className="text-center px-2">
                    <div className="p-3 md:p-4 bg-white rounded-full inline-flex mb-2 md:mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 md:h-10 md:w-10 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="font-semibold text-blue-700 text-sm md:text-base truncate max-w-full">{file.name}</p>
                    <p className="text-xs md:text-sm text-blue-600 mt-1">
                      Ready for transcription
                    </p>
                  </div>
                ) : (
                  <div className="text-center px-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 md:h-16 md:w-16 text-blue-400 mb-3 md:mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-base md:text-lg font-medium text-blue-800">
                      Drag & Drop your audio file
                    </p>
                    <p className="text-blue-600 text-sm md:text-base mt-1 md:mt-2">or click to browse</p>
                    <input
                      type="file"
                      className="hidden"
                      id="file-input"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                    <label
                      htmlFor="file-input"
                      className="mt-3 md:mt-4 px-3 md:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 inline-block cursor-pointer text-sm md:text-base"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>

              {!tempTranscription && (
                <button
                  onClick={handleTranscribe}
                  className="px-6 py-2 md:px-8 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg md:rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 md:gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 md:h-5 md:w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                      <span>Transcribe Audio</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Generated Transcription Display */}
            {tempTranscription && (
              <div className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg p-4 md:p-6 border border-blue-100 animate-fadeIn">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 md:h-6 md:w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg md:text-xl text-blue-800">
                    Generated Transcription
                  </h3>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-5 mb-4 md:mb-6 max-h-48 md:max-h-64 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {tempTranscription}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
                  <button
                    onClick={() => {
                      setTempTranscription("");
                      setFile(null);
                    }}
                    className="px-4 py-2 md:px-6 md:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 md:h-5 md:w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 text-sm md:text-base"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Save Transcription</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-800 mb-1 md:mb-2">
                Your Audio Files
              </h2>
              <p className="text-sm md:text-base text-blue-600">
                Manage your uploaded files and transcriptions
              </p>
            </div>

            {filesList.length === 0 ? (
              <div className="text-center py-12 md:py-16 bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-blue-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 md:h-16 md:w-16 text-blue-400 mx-auto mb-3 md:mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg md:text-xl font-semibold text-blue-700 mb-1 md:mb-2">
                  No files yet
                </h3>
                <p className="text-blue-600 text-sm md:text-base mb-4 md:mb-6">
                  Upload or record audio to get started
                </p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md text-sm md:text-base"
                >
                  Go to Upload
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filesList.map((file) => (
                  <AudioFileCard
                    key={file.id || file.name}
                    file={file}
                    setModal={setModal}
                    fetchFiles={fetchFiles}
                    activePlayerId={activePlayerId}
                    setActivePlayerId={setActivePlayerId}
                    onPlay={handleFilePlay}
                    onDownload={handleFileDownload}
                    onDelete={handleFileDelete}
                    apiBaseUrl={API_BASE_URL.replace('/api', '')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <TranscriptionModal
        isOpen={modal.open}
        fileName={modal.fileName}
        transcription={modal.transcription}
        onClose={() =>
          setModal({ open: false, fileName: "", transcription: "" })
        }
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        @media (min-width: 480px) {
          .xs\:inline {
            display: inline;
          }
        }
        
        @media (max-width: 640px) {
          .fixed.inset-0 {
            padding: 1rem;
          }
          
          .bg-white.rounded-xl {
            border-radius: 0.75rem;
            max-height: 90vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </>
  );
}