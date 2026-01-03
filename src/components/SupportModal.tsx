import React, { useEffect, useRef } from 'react';
import { X, Coffee, Heart } from 'lucide-react';
import '../styles/SupportModal.css';

// Declare QRCode type from CDN
declare const QRCode: any;

interface SupportModalProps {
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ onClose }) => {
    const maribankCanvasRef = useRef<HTMLDivElement>(null);
    const landbankCanvasRef = useRef<HTMLDivElement>(null);

    // QR Code data
    const maribankQR = "00020101021127580012com.p2pqrpay0111LAUIPHM2XXX0208999644030411150909797605204601653036085802PH5914JUNDEE MARK M.6009Pagsanjan63049744";
    const landbankQR = "00020101021127750012com.p2pqrpay0111TLBPPHMMXXX020899964403041059470298880514+63-94546802805204601653036085802PH5918JUNDEE MARK MOLINA6006Manila6304EECF";

    useEffect(() => {
        // Generate QR codes using qrcodegen library (via CDN in index.html)
        const generateQR = async () => {
            try {
                // Wait a bit to ensure QRCode library is loaded
                if (typeof QRCode !== 'undefined') {
                    if (maribankCanvasRef.current) {
                        // Clear any existing QR code
                        maribankCanvasRef.current.innerHTML = '';
                        new QRCode(maribankCanvasRef.current, {
                            text: maribankQR,
                            width: 200,
                            height: 200,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.M
                        });
                    }
                    if (landbankCanvasRef.current) {
                        // Clear any existing QR code
                        landbankCanvasRef.current.innerHTML = '';
                        new QRCode(landbankCanvasRef.current, {
                            text: landbankQR,
                            width: 200,
                            height: 200,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.M
                        });
                    }
                }
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        };

        // Delay to ensure CDN library is loaded
        const timer = setTimeout(generateQR, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="support-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="support-content">
                    <div className="support-header">
                        <div className="support-icon">
                            <Coffee size={48} />
                        </div>
                        <h2>Buy Me a Coffee</h2>
                        <p className="support-subtitle">
                            This is an open-source project made with <Heart size={16} className="heart-icon" fill="currentColor" /> by Jundee Mark Molina
                        </p>
                        <p className="support-description">
                            If you find this project helpful, consider supporting its development. Your donations help keep this project alive and free for everyone!
                        </p>
                    </div>

                    <div className="qr-codes-container">
                        <div className="qr-code-card">
                            <div className="qr-code-header">
                                <div className="bank-logo">
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%234CAF50'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'%3EMB%3C/text%3E%3C/svg%3E" alt="Maribank" />
                                </div>
                                <h3>Maribank</h3>
                            </div>
                            <div className="qr-code-wrapper" ref={maribankCanvasRef}></div>
                            <p className="account-name">JUNDEE MARK M.</p>
                            <p className="scan-instruction">Scan with your banking app</p>
                        </div>

                        <div className="qr-code-divider">
                            <span>OR</span>
                        </div>

                        <div className="qr-code-card">
                            <div className="qr-code-header">
                                <div className="bank-logo">
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232196F3'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'%3ELB%3C/text%3E%3C/svg%3E" alt="Landbank" />
                                </div>
                                <h3>Landbank</h3>
                            </div>
                            <div className="qr-code-wrapper" ref={landbankCanvasRef}></div>
                            <p className="account-name">JUNDEE MARK MOLINA</p>
                            <p className="scan-instruction">Scan with your banking app</p>
                        </div>
                    </div>

                    <div className="support-footer">
                        <p>Thank you for your support! ❤️</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportModal;
