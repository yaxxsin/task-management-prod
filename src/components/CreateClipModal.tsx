import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Mic, ChevronDown, Video, X, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/CreateClipModal.css';

interface CreateClipModalProps {
    onClose: () => void;
}

const SCREEN_OPTIONS = [
    { id: 'entire', label: 'Entire screen', subtext: '1536x960px' },
    { id: 'window', label: 'Window', subtext: 'Select window' },
    { id: 'tab', label: 'Browser Tab', subtext: 'Select tab' }
];

const AUDIO_OPTIONS = [
    { id: 'no-mic', label: 'No microphone' },
    { id: 'default', label: 'Default - Microphone Array (AMD Audio Device)' },
    { id: 'comm', label: 'Communications - Microphone Array (AMD Audio Device)' },
    { id: 'array', label: 'Microphone Array (AMD Audio Device)' },
    { id: 'cable', label: 'CABLE Output (VB-Audio Virtual Cable)' }
];

const CreateClipModal: React.FC<CreateClipModalProps> = ({ onClose }) => {
    const { addClip } = useAppStore();
    const [step, setStep] = useState(1);
    const [selectedScreen, setSelectedScreen] = useState(SCREEN_OPTIONS[0]);
    const [selectedAudio, setSelectedAudio] = useState(AUDIO_OPTIONS[1]);
    const [openDropdown, setOpenDropdown] = useState<'screen' | 'audio' | null>(null);
    // Recording state
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            // 1. Get Display Media (Screen)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // 2. Get User Media (Audio/Mic) if selected
            let finalStream = displayStream;
            if (selectedAudio.id !== 'no-mic') {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: true
                    });

                    // Combine tracks
                    const tracks = [
                        ...displayStream.getVideoTracks(),
                        ...audioStream.getAudioTracks()
                    ];
                    finalStream = new MediaStream(tracks);
                } catch (err) {
                    console.warn("Microphone access denied, recording screen audio only", err);
                }
            }

            streamRef.current = finalStream;
            const recorder = new MediaRecorder(finalStream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);

                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

                const minutes = Math.floor(recordingTime / 60);
                const seconds = recordingTime % 60;
                const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                addClip({
                    name: `screen-recording-${dateStr}-${timeStr}`,
                    duration: durationStr,
                    type: 'video',
                    videoUrl: url,
                    transcript: `Live recording captured using ${selectedScreen.label}. Duration: ${durationStr}.`
                });

                // Clean up
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                onClose();
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setStep(3); // Showing recording state

            // Start Timer
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Handle stream stopping from browser UI
            displayStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

        } catch (err) {
            console.error("Error starting recording:", err);
            setStep(1);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Recording Progress View ---
    if (step === 3) {
        return (
            <div className="recording-status-container">
                <div className="recording-status-pill">
                    <div className="recording-indicator">
                        <div className="rec-dot pulsing"></div>
                        <span className="timer">Recording {formatTime(recordingTime)}</span>
                    </div>
                    <div className="divider"></div>
                    <button className="stop-btn-pill" onClick={stopRecording}>
                        Stop
                    </button>
                </div>
            </div>
        );
    }

    // --- Initial Config View ---
    return (
        <div className="clip-modal-overlay" onClick={onClose}>
            <div className="clip-modal-content" onClick={e => e.stopPropagation()}>
                <div className="clip-modal-header">
                    <button className="close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                    <div className="dropdown-options">
                        <div className="dropdown-container">
                            <div
                                className={`dropdown-item ${openDropdown === 'screen' ? 'active' : ''}`}
                                onClick={() => setOpenDropdown(openDropdown === 'screen' ? null : 'screen')}
                            >
                                <div className="item-icon">
                                    <Monitor size={18} />
                                </div>
                                <div className="item-label">
                                    <span>{selectedScreen.label}</span>
                                    <span className="item-subtext">{selectedScreen.subtext}</span>
                                </div>
                                <ChevronDown size={16} className={`chevron ${openDropdown === 'screen' ? 'rotate' : ''}`} />
                            </div>
                            {openDropdown === 'screen' && (
                                <div className="dropdown-menu">
                                    {SCREEN_OPTIONS.map(opt => (
                                        <div
                                            key={opt.id}
                                            className={`menu-item ${selectedScreen.id === opt.id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedScreen(opt);
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            <div className="menu-item-content">
                                                <span className="menu-label">{opt.label}</span>
                                                <span className="menu-subtext">{opt.subtext}</span>
                                            </div>
                                            {selectedScreen.id === opt.id && <Check size={14} className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="dropdown-container">
                            <div
                                className={`dropdown-item ${openDropdown === 'audio' ? 'active' : ''}`}
                                onClick={() => setOpenDropdown(openDropdown === 'audio' ? null : 'audio')}
                            >
                                <div className="item-icon">
                                    <Mic size={18} />
                                </div>
                                <div className="item-label">
                                    <span className="truncate">{selectedAudio.label}</span>
                                </div>
                                <ChevronDown size={16} className={`chevron ${openDropdown === 'audio' ? 'rotate' : ''}`} />
                            </div>
                            {openDropdown === 'audio' && (
                                <div className="dropdown-menu">
                                    {AUDIO_OPTIONS.map(opt => (
                                        <div
                                            key={opt.id}
                                            className={`menu-item ${selectedAudio.id === opt.id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedAudio(opt);
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            <span className="menu-label">{opt.label}</span>
                                            {selectedAudio.id === opt.id && <Check size={14} className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="clip-modal-footer">
                    <button className="record-btn" onClick={startRecording}>
                        <div className="rec-icon-wrapper">
                            <div className="rec-dot-inner"></div>
                        </div>
                        <span>Record Clip</span>
                        <span className="shortcut">Ctrl+Alt+S</span>
                    </button>
                    <button className="clips-btn">
                        <Video size={16} />
                        <span>Clips</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateClipModal;
